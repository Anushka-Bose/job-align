import Resume from "../models/resumeModel.js";
import User from "../models/userModel.js";
import fs from "fs";
import { createRequire } from "module";
import { runResumePipeline } from "../services/pipelineService.js";
import { sendTopJobMatchesEmail } from "../services/emailService.js";

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
      emailStatus: pipelineResult ? "queued" : "not_attempted",
    });

    if (pipelineResult) {
      sendTopJobMatchesEmail({
        to: candidate?.email,
        candidateName: candidate?.name,
        jobs: pipelineResult.top_jobs || [],
        resumeScore: pipelineResult.resume_score ?? null,
      })
        .then((emailResult) => {
          const status = emailResult?.skipped ? "skipped" : "sent";
          console.log(`Top-match email ${status} for ${candidate?.email || "unknown user"}`, emailResult);
        })
        .catch((emailError) => {
          console.error(`Top-match email failed for ${candidate?.email || "unknown user"}:`, emailError.message);
        });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
