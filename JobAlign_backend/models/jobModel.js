// models/Job.js
import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  type: String,
  description: String,
  redirectUrl: String,
  skillsRequired: [String],
  source: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Job", jobSchema);
