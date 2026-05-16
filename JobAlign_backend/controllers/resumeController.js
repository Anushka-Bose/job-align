import Resume from "../models/resumeModel.js";
import User from "../models/userModel.js";
import fs from "fs";
import { createRequire } from "module";
import { runResumePipeline } from "../services/pipelineService.js";
import {
  createNotificationsForResumeMatches,
  deliverNotificationEmails,
  recordNotificationEmailFailure,
} from "../services/notificationService.js";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const runResumeUploadSideEffects = ({ candidate, resume, pipelineResult }) => {
  setImmediate(async () => {
    try {
      console.log("Starting resume upload side effects for resume:", resume._id);
      
      await createNotificationsForResumeMatches({
        resume,
        jobs: (pipelineResult.top_jobs || []).slice(0, 5),
      });

      if (!candidate?.email) {
        throw new Error("Candidate email was not found in users schema.");
      }

      console.log("Sending stored notification emails to:", candidate.email);
      const emailResult = await deliverNotificationEmails({
        userId: resume.userId,
        resumeId: resume._id,
        limit: 10,
      });

      if (!emailResult?.sent) {
        console.warn("Notification email delivery failed or sent nothing:", emailResult);

        await recordNotificationEmailFailure({
          userId: resume.userId,
          resumeId: resume._id,
          message: emailResult?.failed ? "notification_email_failed" : "notification_email_not_sent",
        });
        return;
      }

      console.log("Notification emails sent successfully:", emailResult);
    } catch (error) {
      console.error("Resume upload side effects failed:", error?.message || error);
      await recordNotificationEmailFailure({
        userId: resume.userId,
        resumeId: resume._id,
        message: error?.message || "side_effect_failed",
      });
    }
  });
};

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

    // IMPORTANT: Return response immediately without waiting for pipeline
    // Pipeline runs async in background
    res.status(201).json({
      resume: {
        _id: resume._id,
        userId: resume.userId,
        fileUrl: resume.fileUrl,
        version: resume.version,
        score: null, // Will be updated after pipeline completes
        skills: [],
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
      },
      pipelineResult: null, // Will be available after polling
      pipelineError: null,
      emailStatus: "queued",
      emailError: null,
      message: "Resume uploaded. Pipeline processing started in background.",
    });

    // Run pipeline async in background (non-blocking)
    setImmediate(async () => {
      try {
        console.log("Starting pipeline processing for resume:", resume._id);
        let pipelineResult = null;
        let pipelineError = null;

        try {
          pipelineResult = await runResumePipeline(filePath, rawText);
          console.log("Pipeline completed for resume:", resume._id);

          if (pipelineResult?.error) {
            pipelineError = pipelineResult.error;
            pipelineResult = null;
            console.error("Pipeline returned error:", pipelineError);
          } else if (Array.isArray(pipelineResult?.top_jobs)) {
            pipelineResult.top_jobs = pipelineResult.top_jobs.map((job) => ({
              ...job,
              score:
                typeof job.score === "number"
                  ? job.score
                  : (typeof job.similarity_score === "number" ? job.similarity_score : null)
            }));
            console.log("Pipeline returned", pipelineResult.top_jobs.length, "jobs");
          }
        } catch (err) {
          pipelineError = err.message;
          console.error("Pipeline error:", err);
        }

        // Update resume with pipeline result
        if (pipelineResult) {
          resume.score = pipelineResult.resume_score ?? null;
          resume.skills = pipelineResult.resume_skills ?? [];
          resume.pipelineResult = pipelineResult;
          await resume.save();
          console.log("Resume updated with pipeline result for resume:", resume._id);

          // Send email and notifications after pipeline completes
          runResumeUploadSideEffects({
            candidate,
            resume,
            pipelineResult,
          });
        } else {
          // Save error state
          resume.pipelineError = pipelineError;
          await resume.save();
          console.error("Resume saved with pipeline error for resume:", resume._id, pipelineError);
        }
      } catch (err) {
        console.error("Resume upload background task failed:", err);
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
