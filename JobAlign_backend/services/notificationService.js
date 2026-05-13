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

const getJobSkills = (job) =>
  uniqueValues([
    ...(Array.isArray(job?.skillsRequired) ? job.skillsRequired : []),
    ...(Array.isArray(job?.skills) ? job.skills : []),
  ]);

const buildNotificationPayload = ({ resume, job, matchScore, matchedSkills }) => ({
  userId: resume.userId,
  resumeId: resume._id,
  jobId: String(job.id || job.jobId || `${job.company || "company"}-${job.title || "job"}`),
  title: job.title || "Matched role",
  company: job.company || "Recommended company",
  location: job.location || "",
  type: job.type || "",
  redirectUrl: job.redirectUrl || job.redirect_url || "",
  message: `New ${job.title || "matched"} role at ${job.company || "a company"} matches your uploaded resume.`,
  matchScore,
  matchedSkills,
  isRead: false,
  emailSentAt: null,
  lastEmailError: "",
});

const upsertNotification = async (payload) => {
  const existing = await Notification.findOne({
    userId: payload.userId,
    jobId: payload.jobId,
  })
    .select("_id")
    .lean();

  if (existing) {
    await Notification.updateOne(
      { _id: existing._id },
      {
        $set: {
          resumeId: payload.resumeId,
          title: payload.title,
          company: payload.company,
          location: payload.location,
          type: payload.type,
          redirectUrl: payload.redirectUrl,
          message: payload.message,
          matchScore: payload.matchScore,
          matchedSkills: payload.matchedSkills,
          isRead: false,
          emailSentAt: null,
          lastEmailError: "",
        },
      },
    );
    return { created: false };
  }

  await Notification.create(payload);
  return { created: true };
};

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
        const payload = buildNotificationPayload({
          resume,
          job,
          matchScore,
          matchedSkills: explanation.matchedSkills,
        });
        const result = await upsertNotification(payload);
        if (result.created) {
          created += 1;
        }
      } catch (error) {
        if (error?.code !== 11000) {
          throw error;
        }
      }
    }
  }

  return { created };
};

export const createNotificationsForResumeMatches = async ({ resume, jobs = [] }) => {
  if (!resume?._id || !resume?.userId || !Array.isArray(jobs) || !jobs.length) {
    return { stored: 0 };
  }

  const resumeSkills = getResumeSkills(resume);
  if (!resumeSkills.length) {
    return { stored: 0 };
  }

  let stored = 0;

  for (const job of jobs) {
    const jobSkills = getJobSkills(job);
    const matchScore = typeof job?.score === "number"
      ? (job.score <= 1 ? Math.round(job.score * 100) : Math.round(job.score))
      : calculateSmartMatchScore(resumeSkills, jobSkills);
    const explanation = getSmartExplanation(resumeSkills, jobSkills);

    if (matchScore < MIN_NOTIFICATION_MATCH_SCORE && !explanation.matchedSkills.length) {
      continue;
    }

    const payload = buildNotificationPayload({
      resume,
      job,
      matchScore,
      matchedSkills: explanation.matchedSkills,
    });

    await upsertNotification(payload);
    stored += 1;
  }

  return { stored };
};

export const deliverNotificationEmails = async ({ userId = null, resumeId = null, limit = 50 } = {}) => {
  const query = {
    emailSentAt: null,
  };

  if (userId) {
    query.userId = userId;
  }

  if (resumeId) {
    query.resumeId = resumeId;
  }

  const pendingNotifications = await Notification.find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  if (!pendingNotifications.length) {
    return { sent: 0, failed: 0, pending: 0 };
  }

  const users = await User.find({
    _id: { $in: uniqueValues(pendingNotifications.map((item) => String(item.userId))) },
  })
    .select("_id name email")
    .lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));

  let sent = 0;
  let failed = 0;

  for (const notification of pendingNotifications) {
    const candidate = usersById.get(String(notification.userId));

    try {
      const result = await sendJobMatchEmail({
        to: candidate?.email,
        candidateName: candidate?.name,
        job: {
          title: notification.title,
          company: notification.company,
          location: notification.location,
          redirectUrl: notification.redirectUrl,
        },
        matchScore: notification.matchScore,
        matchedSkills: notification.matchedSkills || [],
      });

      if (result?.skipped) {
        failed += 1;
        await Notification.updateOne(
          { _id: notification._id },
          {
            $inc: { emailAttempts: 1 },
            $set: {
              lastEmailError: result.reason || "email_skipped",
            },
          },
        );
        continue;
      }

      sent += 1;
      await Notification.updateOne(
        { _id: notification._id },
        {
          $inc: { emailAttempts: 1 },
          $set: {
            emailSentAt: new Date(),
            lastEmailError: "",
          },
        },
      );
    } catch (error) {
      failed += 1;
      await Notification.updateOne(
        { _id: notification._id },
        {
          $inc: { emailAttempts: 1 },
          $set: {
            lastEmailError: error?.message || "email_send_failed",
          },
        },
      );
    }
  }

  return {
    sent,
    failed,
    pending: Math.max(0, pendingNotifications.length - sent),
  };
};

export const markNotificationEmailsDelivered = async ({ userId = null, resumeId = null }) => {
  const query = {};

  if (userId) {
    query.userId = userId;
  }

  if (resumeId) {
    query.resumeId = resumeId;
  }

  if (!Object.keys(query).length) {
    return { updated: 0 };
  }

  const result = await Notification.updateMany(
    query,
    {
      $set: {
        emailSentAt: new Date(),
        lastEmailError: "",
      },
    },
  );

  return {
    updated: result.modifiedCount ?? 0,
  };
};

export const recordNotificationEmailFailure = async ({ userId = null, resumeId = null, message = "email_send_failed" }) => {
  const query = {};

  if (userId) {
    query.userId = userId;
  }

  if (resumeId) {
    query.resumeId = resumeId;
  }

  if (!Object.keys(query).length) {
    return { updated: 0 };
  }

  const result = await Notification.updateMany(
    query,
    {
      $inc: { emailAttempts: 1 },
      $set: {
        lastEmailError: message,
      },
    },
  );

  return {
    updated: result.modifiedCount ?? 0,
  };
};
