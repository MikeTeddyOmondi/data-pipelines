import {config } from "dotenv";
import express, { json } from "express";
import { connect } from "amqplib";
import AWS from "aws-sdk";
import connectDB from "./db.js";
import Event from "./models/event.js";

config();

const app = express();
app.use(json());

// Connect to MongoDB
connectDB();

// Configure MinIO client
const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(
    `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`
  ),
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  sslEnabled: process.env.MINIO_USE_SSL === "false",
  s3ForcePathStyle: true, // Required for MinIO
});

async function downloadFromS3(bucketName, key) {
  const params = {
    Bucket: bucketName,
    Key: key,
  };
  try {
    const data = await s3.getObject(params).promise();
    return data.Body.toString("utf-8");
  } catch (err) {
    console.error(`Error downloading from S3 ${bucketName}/${key}:`, err);
    throw err;
  }
}

async function uploadToS3(bucketName, key, body) {
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: body,
  };
  try {
    await s3.upload(params).promise();
    console.log(`File uploaded successfully to ${bucketName}/${key}`);
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw err;
  }
}

async function connectToRabbitMQ() {
  try {
    const connection = await connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    const processedActivityQueue = process.env.PROCESSED_ACTIVITY_QUEUE;
    await channel.assertQueue(processedActivityQueue, { durable: false });
    return channel;
  } catch (err) {
    console.error("Error connecting to RabbitMQ:", err);
    throw err;
  }
}

async function processMessage(msg) {
  let channel; // Declare channel here
  try {
    const messageContent = JSON.parse(msg.content.toString());
    const { bucket, key, eventId } = messageContent;

    console.log(
      `Received message: Bucket=${bucket}, Key=${key}, EventId=${eventId}`
    );

    // Download the file from S3
    const fileContent = await downloadFromS3(bucket, key);
    const eventData = JSON.parse(fileContent);

    // Upload the data to the data warehouse bucket
    const newKey = key.replace("processed-activity/", "warehouse-activity/");
    await uploadToS3(
      "data-warehouse",
      newKey,
      JSON.stringify(eventData)
    );

    console.log(`Uploaded to data-warehouse/${newKey}`);

    // Update MongoDB to reflect that data warehouse loading is complete
    await Event.updateOne({ eventId: eventId }, { status: "loaded" });
    console.log(`Updated MongoDB status to 'loaded' for event ${eventId}`);
  } catch (error) {
    console.error("Error processing message:", error);
  } finally {
    if (channel) {
      await channel.close();
    }
  }
}

async function startConsumer() {
  try {
    const channel = await connectToRabbitMQ();
    const processedActivityQueue = process.env.PROCESSED_ACTIVITY_QUEUE;

    channel.consume(
      processedActivityQueue,
      (msg) => {
        processMessage(msg)
          .then(() => {
            channel.ack(msg); // Acknowledge message after processing
          })
          .catch((err) => {
            console.error("Error during processing:", err);
            channel.nack(msg, false, false); // Reject message on error
          });
      },
      { noAck: false }
    ); // Ensure messages are acknowledged
    console.log("Listening for messages...");
  } catch (err) {
    console.error("Failed to start consumer:", err);
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const port = 5555;
app.listen(port, async () => {
  await startConsumer();
  console.log(`Server listening on port ${port}`);
});