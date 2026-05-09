import Notification from "../models/notificationModel.js";
import Resume from "../models/resumeModel.js";
import User from "../models/userModel.js";
import { calculateSmartMatchScore, getSmartExplanation } from "./matchService.js";
import { sendJobMatchEmail } from "./emailService.js";

const MIN_NOTIFICATION_MATCH_SCORE = Number(process.env.MIN_NOTIFICATION_MATCH_SCORE || 35);

const uniqueValues = (values = []) => [...new Set((values || []).filter(Boolean))];

const getResumeSkills = (resume) => uniqueValues([
  ...(Array.isArray(resume?.skills) ? resume.skills : []),
  ...(Array.isArray(resume?.pipelineResult?.resume_skills) ? resume.pipelineResult.resume_skills : []),
]);

const getLatestCandidateResumes = async () => {
  const candidates = await User.find({ role: "candidate" })
    .select("_id")
    .lean();

  const candidateIds = candidates.map((candidate) => candidate._id);
  const resumes = await Resume.find({
    userId: { $in: candidateIds },
    $or: [
      { skills: { $exists: true, $ne: [] } },
      { "pipelineResult.resume_skills.0": { $exists: true } },
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

  return Array.from(latestByUser.values());
};

export const createNotificationsForNewJobs = async (jobs = []) => {
  if (!Array.isArray(jobs) || !jobs.length) {
    return { created: 0 };
  }

  const latestResumes = await getLatestCandidateResumes();
  if (!latestResumes.length) {
    return { created: 0 };
  }

  const users = await User.find({
    _id: { $in: latestResumes.map((resume) => resume.userId) },
  })
    .select("_id name email")
    .lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  let created = 0;

  for (const job of jobs) {
    const jobSkills = Array.isArray(job.skillsRequired) ? job.skillsRequired : [];
    if (!jobSkills.length) {
      continue;
    }

    for (const resume of latestResumes) {
      const resumeSkills = getResumeSkills(resume);
      if (!resumeSkills.length) {
        continue;
      }

      const matchScore = calculateSmartMatchScore(resumeSkills, jobSkills);
      const explanation = getSmartExplanation(resumeSkills, jobSkills);
      if (matchScore < MIN_NOTIFICATION_MATCH_SCORE && !explanation.matchedSkills.length) {
        continue;
      }

      try {
        await Notification.create({
          userId: resume.userId,
          resumeId: resume._id,
          jobId: String(job.id),
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          redirectUrl: job.redirectUrl || "",
          message: `New ${job.title} role at ${job.company} matches your uploaded resume.`,
          matchScore,
          matchedSkills: explanation.matchedSkills,
        });
        const candidate = usersById.get(String(resume.userId));
        try {
          await sendJobMatchEmail({
            to: candidate?.email,
            candidateName: candidate?.name,
            job,
            matchScore,
            matchedSkills: explanation.matchedSkills,
          });
        } catch (emailError) {
          console.error(`Email notification failed for ${candidate?.email || "unknown user"}:`, emailError.message);
        }
        created += 1;
      } catch (error) {
        if (error?.code !== 11000) {
          throw error;
        }
      }
    }
  }

  return { created };
};
