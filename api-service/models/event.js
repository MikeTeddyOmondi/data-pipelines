// common/models/event.js
import {Schema, model} from "mongoose";

const EventSchema = new Schema({
  eventId: { type: String, required: true, unique: true },
  user_id: { type: String },
  activity: { type: String },
  page: { type: String },
  s3Bucket: { type: String },
  s3Key: { type: String },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "loaded", "failed"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
});

const Event = model("Event", EventSchema);

export default Event;
