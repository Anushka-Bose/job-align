import express from "express";
import Job from "../models/jobModel.js";
import Resume from "../models/resumeModel.js";
import {
  calculateSmartMatchScore,
  getSmartExplanation
} from "../services/matchService.js";

const router = express.Router();
// GET personalized jobs
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const resume = await Resume.findOne({ userId });
    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    const jobs = await Job.find();

    const results = jobs.map(job => {
      const score = calculateSmartMatchScore(
        resume.skills,
        job.skillsRequired
      );

      const explanation = getSmartExplanation(
        resume.skills,
        job.skillsRequired
      );

      return {
        jobId: job._id,
        title: job.title,
        company: job.company,
        location: job.location,
        matchScore: score,
        explanation
      };
    });

    res.status(200).json({ jobs: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;