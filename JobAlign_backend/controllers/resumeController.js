import Resume from "../models/resumeModel.js";
import fs from "fs";
import { createRequire } from "module";
import { runResumePipeline } from "../services/pipelineService.js";

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
      resume,
      pipelineResult,
      pipelineError
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
