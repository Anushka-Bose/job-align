import Resume from "../models/resumeModel.js";
import User from "../models/userModel.js";
import fs from "fs";
import { createRequire } from "module";
import { runResumePipeline } from "../services/pipelineService.js";
import { sendResumeTopJobsEmail } from "../services/emailService.js";
import {
  createNotificationsForResumeMatches,
  markNotificationEmailsDelivered,
  recordNotificationEmailFailure,
} from "../services/notificationService.js";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume PDF is required" });
    }
    const filePath = req.file.path;

    const dataBuffer = fs.readFileSync(filePath);

    const parsed = await pdf(dataBuffer);

    const rawText = parsed.text;

    const count = await Resume.countDocuments({
      userId: req.user.id
    });

    const resume = await Resume.create({
      userId: req.user.id,
      fileUrl: filePath,
      rawText,
      version: count + 1
    });
    const candidate = await User.findById(req.user.id).select("name email").lean();
    let pipelineResult = null;
    let pipelineError = null;
    let emailStatus = "not_attempted";
    let emailError = null;
    try {
      pipelineResult = await runResumePipeline(filePath, rawText);

      if (pipelineResult?.error) {
        pipelineError = pipelineResult.error;
        pipelineResult = null;
      } else if (Array.isArray(pipelineResult?.top_jobs)) {
        pipelineResult.top_jobs = pipelineResult.top_jobs.map((job) => ({
          ...job,
          score:
            typeof job.score === "number"
              ? job.score
              : (typeof job.similarity_score === "number" ? job.similarity_score : null)
        }));
      }
    } catch (err) {
      pipelineError = err.message;
    }

    if (pipelineResult) {
      resume.score = pipelineResult.resume_score ?? null;
      resume.skills = pipelineResult.resume_skills ?? [];
      resume.pipelineResult = pipelineResult;
      await resume.save();
      await createNotificationsForResumeMatches({
        resume,
        jobs: (pipelineResult.top_jobs || []).slice(0, 5),
      });

      try {
        if (!candidate?.email) {
          throw new Error("Candidate email was not found in users schema.");
        }

        const emailResult = await sendResumeTopJobsEmail({
          user: candidate,
          resume,
        });

        if (emailResult?.skipped) {
          emailStatus = "skipped";
          emailError = emailResult.reason || "email_skipped";
          await recordNotificationEmailFailure({
            userId: resume.userId,
            resumeId: resume._id,
            message: emailError,
          });
        } else {
          emailStatus = "sent";
          await markNotificationEmailsDelivered({
            userId: resume.userId,
            resumeId: resume._id,
          });
        }
      } catch (error) {
        emailStatus = "failed";
        emailError = error.message;
        await recordNotificationEmailFailure({
          userId: resume.userId,
          resumeId: resume._id,
          message: error.message,
        });
      }
    }

    res.status(201).json({
      resume: {
        _id: resume._id,
        userId: resume.userId,
        fileUrl: resume.fileUrl,
        version: resume.version,
        score: resume.score ?? null,
        skills: Array.isArray(resume.skills) ? resume.skills : [],
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
      pipelineResult,
      pipelineError,
      emailStatus,
      emailError,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
