import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
  },
  jobId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "",
  },
  redirectUrl: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    required: true,
  },
  matchScore: {
    type: Number,
    default: 0,
  },
  matchedSkills: {
    type: [String],
    default: [],
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
}, { timestamps: true });

notificationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
