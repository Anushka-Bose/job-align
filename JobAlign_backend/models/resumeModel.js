import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  fileUrl: String,
  rawText: String,

  score: Number,
  skills: [String],
  experience: [String],
  education: [String],
  projects: [String],
  experienceYears: {
    type: Number,
    default: 0
  },
  pipelineResult: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  version: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;