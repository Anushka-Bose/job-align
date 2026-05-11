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
const RESUME_FEED_PROJECTION = [
  "skills",
  "score",
  "pipelineResult.resume_score",
  "pipelineResult.competencies",
  "pipelineResult.competency_gap",
  "pipelineResult.match_summary",
  "pipelineResult.highlights",
  "pipelineResult.top_jobs",
  "pipelineResult.search_keywords",
  "pipelineResult.resume_skills",
].join(" ");

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

const getStoredPipelineJobs = (resume, resumeSkills) => {
  const jobs = Array.isArray(resume?.pipelineResult?.top_jobs)
    ? resume.pipelineResult.top_jobs
    : [];

  return jobs.map((job, index) => {
    const jobSkills = Array.isArray(job.skillsRequired)
      ? job.skillsRequired
      : (Array.isArray(job.skills) ? job.skills : []);
    const matchScore = typeof job.score === "number"
      ? job.score
      : (
        typeof job.adjusted_similarity_score === "number"
          ? job.adjusted_similarity_score
          : (
            typeof job.similarity_score === "number"
              ? job.similarity_score
              : calculateSmartMatchScore(resumeSkills, jobSkills)
          )
      );
    const explanation = getSmartExplanation(resumeSkills, jobSkills);

    return {
      jobId: job.id || `${resume._id}-${index}`,
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      description: job.description,
      redirectUrl: job.redirectUrl || job.redirect_url,
      source: job.source,
      searchQuery: job.searchQuery || job.search_query,
      skillsRequired: jobSkills,
      matchScore,
      explanation,
    };
  });
};

const getStoredAnalysis = (resume) => {
  if (!resume?.pipelineResult) {
    return null;
  }

  return {
    resume_score: resume.pipelineResult.resume_score ?? resume.score ?? null,
    competencies: resume.pipelineResult.competencies ?? {},
    competency_gap: Array.isArray(resume.pipelineResult.competency_gap) ? resume.pipelineResult.competency_gap : [],
    match_summary: resume.pipelineResult.match_summary ?? null,
    highlights: Array.isArray(resume.pipelineResult.highlights) ? resume.pipelineResult.highlights : [],
    top_jobs: Array.isArray(resume.pipelineResult.top_jobs) ? resume.pipelineResult.top_jobs : [],
    search_keywords: Array.isArray(resume.pipelineResult.search_keywords) ? resume.pipelineResult.search_keywords : [],
    resume_skills: Array.isArray(resume.pipelineResult.resume_skills) ? resume.pipelineResult.resume_skills : [],
  };
};

// GET personalized jobs for a candidate based on the latest uploaded resume
router.get("/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role !== "recruiter" && req.user.id !== userId) {
      return res.status(403).json({ message: "You can only view your own job feed" });
    }

    const latestResume = await Resume.findOne({ userId }).select(RESUME_FEED_PROJECTION).sort({ createdAt: -1 }).lean();
    if (!latestResume) {
      return res.status(200).json({
        userId,
        needsResumeUpload: true,
        emptyState: {
          title: "Upload your resume to see jobs",
          message: "Add your latest resume and JobAlign will build your personalized job feed."
        },
        searchQueries: [],
        resumeSkills: [],
        totalActiveJobs: 0,
        filteredJobs: 0,
        jobs: [],
      });
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
      }).select(RESUME_FEED_PROJECTION).sort({ createdAt: -1 }).lean();

    if (!resume) {
      return res.status(200).json({
        userId,
        resumeId: latestResume._id,
        needsResumeUpload: true,
        emptyState: {
          title: "Upload your resume to refresh job matches",
          message: "We could not read enough skill data from the current resume yet. Upload it again to generate your job feed."
        },
        searchQueries: [],
        resumeSkills: [],
        totalActiveJobs: 0,
        filteredJobs: 0,
        jobs: [],
      });
    }

    const resumeSkills = getResumeSkills(resume);
    const searchQueries = buildSearchQueries(resumeSkills, resume);

    if (!resumeSkills.length && !searchQueries.length) {
      return res.status(200).json({
        userId,
        resumeId: resume._id,
        needsResumeUpload: true,
        emptyState: {
          title: "Upload your resume to see jobs",
          message: "Your current resume does not have enough extracted skills yet. Upload it again to refresh analysis."
        },
        searchQueries: [],
        resumeSkills: [],
        totalActiveJobs: 0,
        filteredJobs: 0,
        jobs: [],
      });
    }

    const storedPipelineJobs = getStoredPipelineJobs(resume, resumeSkills);
    if (storedPipelineJobs.length) {
      const jobsToReturn = [...storedPipelineJobs].sort((left, right) => {
        const leftScore = typeof left.matchScore === "number" ? left.matchScore : 0;
        const rightScore = typeof right.matchScore === "number" ? right.matchScore : 0;
        return rightScore - leftScore;
      });

      return res.status(200).json({
        userId,
        resumeId: resume._id,
        analysis: getStoredAnalysis(resume),
        searchQueries,
        resumeSkills,
        totalActiveJobs: storedPipelineJobs.length,
        filteredJobs: storedPipelineJobs.length,
        jobs: jobsToReturn,
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
      analysis: getStoredAnalysis(resume),
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
