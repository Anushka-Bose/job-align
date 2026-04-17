import Resume from "../models/resumeModel.js";
import fs from "fs";
import { createRequire } from "module";
import { runResumePipeline } from "../services/pipelineService.js";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export const uploadResume = async (req, res) => {
  try {
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
      const jobsFromBody =
        typeof req.body.jobs === "string" ? JSON.parse(req.body.jobs) : undefined;
      pipelineResult = await runResumePipeline(filePath, jobsFromBody);
    } catch (err) {
      pipelineError = err.message;
    }

    res.status(201).json({
      resume,
      pipelineResult,
      pipelineError
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};