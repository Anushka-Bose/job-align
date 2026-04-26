import express from "express";
import Resume from "../models/resumeModel.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  calculateSmartMatchScore,
  getSmartExplanation
} from "../services/matchService.js";
import { fetchJobsFromApi } from "../services/jobService.js";

const router = express.Router();
const DEFAULT_PREFERRED_LOCATION = process.env.DEFAULT_JOB_LOCATION || "India";

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

const getResumeSkills = (resume) => uniqueValues([
  ...(Array.isArray(resume?.skills) ? resume.skills : []),
  ...(Array.isArray(resume?.pipelineResult?.resume_skills) ? resume.pipelineResult.resume_skills : []),
]);

const buildSearchQueries = (resumeSkills, resume) => {
  const skills = uniqueValues(resumeSkills);
  if (!skills.length) {
    const pipelineKeywords = Array.isArray(resume?.pipelineResult?.search_keywords)
      ? resume.pipelineResult.search_keywords
      : [];
    return uniqueValues(pipelineKeywords);
  }

  return uniqueValues([
    skills.slice(0, 3).join(" "),
    ...skills.slice(0, 5).map((skill) => `${skill} developer`),
    ...skills.slice(0, 2).map((skill) => `${skill} engineer`),
  ]).slice(0, 5);
};

const hasPipelineData = (resume) => {
  const resumeSkills = getResumeSkills(resume);
  const pipelineKeywords = Array.isArray(resume?.pipelineResult?.search_keywords)
    ? uniqueValues(resume.pipelineResult.search_keywords)
    : [];

  return resumeSkills.length > 0 || pipelineKeywords.length > 0;
};

// GET personalized jobs for a candidate based on the latest uploaded resume
router.get("/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== "recruiter" && req.user.id !== userId) {
      return res.status(403).json({ message: "You can only view your own job feed" });
    }

    const latestResume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
    if (!latestResume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    const resume = hasPipelineData(latestResume)
      ? latestResume
      : await Resume.findOne({
        userId,
        $or: [
          { skills: { $exists: true, $ne: [] } },
          { "pipelineResult.resume_skills.0": { $exists: true } },
          { "pipelineResult.search_keywords.0": { $exists: true } },
        ],
      }).sort({ createdAt: -1 });

    if (!resume) {
      return res.status(400).json({
        message: "Resume upload exists, but no analyzed resume data is available yet."
      });
    }

    const resumeSkills = getResumeSkills(resume);
    const searchQueries = buildSearchQueries(resumeSkills, resume);

    if (!resumeSkills.length && !searchQueries.length) {
      return res.status(400).json({
        message: "Resume is missing pipeline skills, upload the resume again to refresh analysis"
      });
    }

    const jobs = await fetchJobsFromApi(searchQueries, {
      preferredLocation: DEFAULT_PREFERRED_LOCATION,
    });
    const scoredJobs = jobs.map((job) => {
      const jobSkills = Array.isArray(job.skillsRequired) ? job.skillsRequired : [];
      const matchScore = calculateSmartMatchScore(resumeSkills, jobSkills);
      const explanation = getSmartExplanation(resumeSkills, jobSkills);

      return {
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        type: job.type,
        description: job.description,
        redirectUrl: job.redirectUrl,
        source: job.source,
        searchQuery: job.searchQuery,
        skillsRequired: jobSkills,
        matchScore,
        explanation
      };
    });

    const filteredJobs = scoredJobs
      .filter((job) => job.matchScore > 0 || job.explanation.matchedSkills.length > 0)
      .sort((left, right) => right.matchScore - left.matchScore);

    const jobsToReturn = filteredJobs.length
      ? filteredJobs
      : scoredJobs.sort((left, right) => right.matchScore - left.matchScore).slice(0, 10);

    res.status(200).json({
      userId,
      resumeId: resume._id,
      searchQueries,
      resumeSkills,
      totalActiveJobs: jobs.length,
      filteredJobs: filteredJobs.length,
      jobs: jobsToReturn
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
