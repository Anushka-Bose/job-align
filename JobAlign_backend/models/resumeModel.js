import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  fileUrl: String,
  rawText: String,

  skills: [String],
  experience: [String],
  education: [String],

  version: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;