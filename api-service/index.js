import { config } from "dotenv";
import express, { json } from "express";
import { connect } from "amqplib";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

config();

// Import the database connection
import connectDB from "./db.js";

// Unified Mongoose model
import Event from "./models/event.js";

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
    const queue = "user-activity";
    await channel.assertQueue(queue, { durable: false });
    return channel;
  } catch (err) {
    console.error("Error connecting to RabbitMQ:", err);
    throw err;
  }
}

let rabbitMQChannel;
connectToRabbitMQ()
  .then((channel) => {
    rabbitMQChannel = channel;
  })
  .catch((err) => {
    console.error("Failed to connect to RabbitMQ, exiting", err);
    process.exit(1);
  });

app.post("/events", async (req, res) => {
  try {
    const eventData = req.body;
    const eventId = uuidv4();
    const key = `user-activity/${eventId}.json`;
    const s3Bucket = process.env.RAW_DATA_BUCKET;

    // Upload to S3
    await uploadToS3(s3Bucket, key, JSON.stringify(eventData));

    // Create a new event in MongoDB
    const newEvent = new Event({
      eventId: eventId,
      user_id: eventData.user_id,
      activity: eventData.activity,
      page: eventData.page,
      s3Bucket: s3Bucket,
      s3Key: key,
    });

    await newEvent.save();

    // Publish message to RabbitMQ
    rabbitMQChannel.sendToQueue(
      "user-activity",
      Buffer.from(JSON.stringify({ bucket: s3Bucket, key, eventId }))
    );

    console.log("Event published to RabbitMQ");
    res.status(202).send("Event received and processing started.");
  } catch (error) {
    console.error("Error processing event:", error);
    res.status(500).send("Error processing event.");
  }
});

const port = 3333;
app.listen(port, async () => {
  s3.createBucket(process.env.RAW_DATA_BUCKET)
  console.log(`Server listening on port ${port}`);
});
