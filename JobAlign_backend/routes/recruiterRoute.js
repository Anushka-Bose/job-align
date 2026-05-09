import express from "express";
import Job from "../models/jobModel.js";
import Resume from "../models/resumeModel.js";
import User from "../models/userModel.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { calculateSmartMatchScore, getSmartExplanation } from "../services/matchService.js";
import { analyzeResumeAgainstJobs } from "../services/pipelineService.js";
import { runResumeScamCheck } from "../services/scamService.js";

const router = express.Router();

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeArray = (values = []) => [...new Set((values || []).filter(Boolean))];
const companyMatches = (left = "", right = "") =>
  String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();

const getCompanyJobs = async (company) =>
  Job.find({
    company: {
      $regex: `^${escapeRegex(String(company || "").trim())}$`,
      $options: "i",
    },
  }).lean();

const getLatestCandidateResumes = async () => {
  const candidates = await User.find({ role: "candidate" })
    .select("_id name email")
    .lean();

  const candidateIds = candidates.map((candidate) => candidate._id);
  const resumes = await Resume.find({
    userId: { $in: candidateIds },
    $or: [
      { rawText: { $exists: true, $ne: "" } },
      { fileUrl: { $exists: true, $ne: "" } },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const latestByUser = new Map();
  for (const resume of resumes) {
    const key = String(resume.userId);
    if (!latestByUser.has(key)) {
      latestByUser.set(key, resume);
    }
  }

  return candidates
    .map((candidate) => ({
      candidate,
      resume: latestByUser.get(String(candidate._id)) || null,
    }))
    .filter((item) => item.resume);
};

const getPipelineCompanyMatches = (resume, company) =>
  (Array.isArray(resume?.pipelineResult?.top_jobs) ? resume.pipelineResult.top_jobs : [])
    .filter((job) => companyMatches(job?.company, company))
    .sort((left, right) => {
      const leftScore = typeof left?.score === "number"
        ? left.score
        : (typeof left?.similarity_score === "number" ? left.similarity_score : 0);
      const rightScore = typeof right?.score === "number"
        ? right.score
        : (typeof right?.similarity_score === "number" ? right.similarity_score : 0);
      return rightScore - leftScore;
    });

const buildEligibility = (resume, jobs) => {
  const resumeSkills = normalizeArray([
    ...(Array.isArray(resume.skills) ? resume.skills : []),
    ...(Array.isArray(resume.pipelineResult?.resume_skills) ? resume.pipelineResult.resume_skills : []),
  ]);

  const rankedJobs = jobs
    .map((job) => {
      const jobSkills = Array.isArray(job.skillsRequired) ? job.skillsRequired : [];
      const eligibilityScore = calculateSmartMatchScore(resumeSkills, jobSkills);
      const explanation = getSmartExplanation(resumeSkills, jobSkills);

      return {
        job,
        jobSkills,
        eligibilityScore,
        explanation,
      };
    })
    .sort((left, right) => right.eligibilityScore - left.eligibilityScore);

  const bestMatch = rankedJobs[0];
  return {
    resumeSkills,
    rankedJobs,
    bestMatch,
    isEligible: Boolean(
      bestMatch &&
      (bestMatch.eligibilityScore > 0 || bestMatch.explanation.matchedSkills.length > 0)
    ),
  };
};

router.get("/candidates/leaderboard", protect, authorizeRoles("recruiter"), async (req, res) => {
  try {
    const recruiter = await User.findById(req.user.id).lean();
    if (!recruiter?.company) {
      return res.status(400).json({ message: "Recruiter company is not configured." });
    }

    const companyJobs = await getCompanyJobs(recruiter.company);

    const candidateResumes = await getLatestCandidateResumes();
    const leaderboard = await Promise.all(
      candidateResumes.map(async ({ candidate, resume }) => {
        const pipelineCompanyMatches = getPipelineCompanyMatches(resume, recruiter.company);
        const storedTopJob = pipelineCompanyMatches[0] || null;
        const fallbackEligibility = companyJobs.length ? buildEligibility(resume, companyJobs) : null;
        const isEligibleFromStoredPipeline = Boolean(storedTopJob);
        const isEligibleFromCompanyJobs = Boolean(fallbackEligibility?.isEligible);

        if (!isEligibleFromStoredPipeline && !isEligibleFromCompanyJobs) {
          return null;
        }

        let pipelineResult = null;
        if (!storedTopJob && companyJobs.length) {
          pipelineResult = await analyzeResumeAgainstJobs({
            filePath: resume.fileUrl || "",
            rawText: resume.rawText || "",
            jobs: companyJobs,
          });

          if (pipelineResult?.error) {
            return null;
          }
        }

        const rescoredTopJob = Array.isArray(pipelineResult?.top_jobs) ? pipelineResult.top_jobs[0] : null;
        const topJob = storedTopJob || rescoredTopJob;
        const pipelineScore = storedTopJob
          ? (resume.score ?? resume.pipelineResult?.resume_score ?? 0)
          : (pipelineResult?.resume_score ?? resume.score ?? 0);
        const eligibilityScore = storedTopJob
          ? (() => {
              const rawScore = typeof storedTopJob.score === "number"
                ? storedTopJob.score
                : storedTopJob.similarity_score;
              if (typeof rawScore !== "number") return resume.score ?? 0;
              return rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
            })()
          : (fallbackEligibility?.bestMatch?.eligibilityScore ?? 0);
        const matchedSkills = fallbackEligibility?.bestMatch?.explanation?.matchedSkills
          || normalizeArray(resume.pipelineResult?.resume_skills || resume.skills || []);
        const missingSkills = fallbackEligibility?.bestMatch?.explanation?.missingSkills || [];

        return {
          candidateId: candidate._id,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          pipelineScore,
          matchedJob: topJob
            ? {
                title: topJob.title,
                company: topJob.company,
                location: topJob.location,
                similarityScore: topJob.similarity_score ?? topJob.score ?? null,
              }
            : {
                title: fallbackEligibility?.bestMatch?.job?.title || "Company role",
                company: recruiter.company,
                location: fallbackEligibility?.bestMatch?.job?.location || "",
                similarityScore: null,
              },
          eligibilityScore,
          matchedSkills,
          missingSkills,
          resumeId: resume._id,
        };
      }),
    );

    res.status(200).json({
      company: recruiter.company,
      totalJobs: companyJobs.length,
      candidates: leaderboard
        .filter(Boolean)
        .sort((left, right) => right.pipelineScore - left.pipelineScore),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not build recruiter leaderboard." });
  }
});

router.post("/candidates/:candidateId/scam-check", protect, authorizeRoles("recruiter"), async (req, res) => {
  try {
    const recruiter = await User.findById(req.user.id).lean();
    if (!recruiter?.company) {
      return res.status(400).json({ message: "Recruiter company is not configured." });
    }

    const resume = await Resume.findOne({ userId: req.params.candidateId })
      .sort({ createdAt: -1 })
      .lean();

    if (!resume) {
      return res.status(404).json({ message: "Candidate resume not found." });
    }

    const companyJobs = await getCompanyJobs(recruiter.company);
    const pipelineCompanyMatches = getPipelineCompanyMatches(resume, recruiter.company);
    const fallbackEligibility = companyJobs.length ? buildEligibility(resume, companyJobs) : null;

    if (!pipelineCompanyMatches.length && !fallbackEligibility?.isEligible) {
      return res.status(403).json({ message: "This candidate is not eligible for your company jobs." });
    }

    const scamCheck = await runResumeScamCheck({
      filePath: resume.fileUrl || "",
      rawText: resume.rawText || "",
    });

    res.status(200).json({
      candidateId: req.params.candidateId,
      company: recruiter.company,
      scamCheck,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Scam check failed." });
  }
});

export default router;
