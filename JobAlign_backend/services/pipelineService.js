import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ML_CLI_PATH = path.join(PROJECT_ROOT, "ml", "pipeline_cli.py");
const REMOTIVE_API_URL = process.env.REMOTIVE_API_URL || "https://remotive.com/api/remote-jobs";
const BUNDLED_PYTHON_PATH = path.join(
  process.env.USERPROFILE || "C:\\Users\\91983",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "python",
  "python.exe",
);

const pythonCandidates = (() => {
  const candidates = [];
  if (process.env.PYTHON_EXECUTABLE) {
    candidates.push({
      command: process.env.PYTHON_EXECUTABLE,
      prefixArgs: [],
    });
  }
  candidates.push({
    command: BUNDLED_PYTHON_PATH,
    prefixArgs: [],
  });
  if (process.platform === "win32") {
    candidates.push({
      command: "py",
      prefixArgs: ["-3"],
    });
  }
  candidates.push(
    { command: "python", prefixArgs: [] },
    { command: "python3", prefixArgs: [] },
  );
  return candidates;
})();

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const normalizeJob = (job, query) => ({
  id: job.id || `${query}-${job.title || "job"}`,
  title: job.title || "Untitled role",
  company: job.company_name || "Unknown company",
  location: job.candidate_required_location || "Remote",
  type: job.job_type || "remote",
  description: stripHtml(job.description),
  redirect_url: job.url || null,
  source: "remotive",
  search_query: query,
});

const runPythonCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `Python exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Invalid JSON returned by pipeline: ${stdout}`));
      }
    });
  });

const runPythonPipeline = async (args) => {
  let lastError = null;

  for (const candidate of pythonCandidates) {
    try {
      return await runPythonCommand(candidate.command, [...candidate.prefixArgs, ML_CLI_PATH, ...args]);
    } catch (error) {
      const message = String(error?.message || "");
      if (
        message.includes("ENOENT") ||
        message.includes("not found") ||
        message.includes("is not recognized") ||
        message.includes("No installed Python found")
      ) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Python executable not found.");
};

const fetchJobsForKeywords = async (keywords) => {
  const uniqueJobs = new Map();

  for (const keyword of keywords) {
    const url = new URL(REMOTIVE_API_URL);
    url.searchParams.set("search", keyword);
    url.searchParams.set("limit", "8");

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Job API request failed with status ${response.status}`);
    }

    const payload = await response.json();
    for (const job of payload.jobs || []) {
      const normalized = normalizeJob(job, keyword);
      uniqueJobs.set(String(normalized.id), normalized);
    }
  }

  return Array.from(uniqueJobs.values());
};

export const runResumePipeline = async (filePath, rawText = "") => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-align-"));
  const jobsPath = path.join(tempDir, "jobs.json");
  const resumeTextPath = path.join(tempDir, "resume.txt");

  await fs.writeFile(resumeTextPath, rawText || "", "utf-8");

  const keywordCommand = rawText.trim() ? ["keywords-text", resumeTextPath] : ["keywords", filePath];
  const keywordPayload = await runPythonPipeline(keywordCommand);
  if (keywordPayload?.error) {
    await fs.rm(tempDir, { recursive: true, force: true });
    return keywordPayload;
  }

  const searchKeywords = Array.isArray(keywordPayload?.search_keywords)
    ? keywordPayload.search_keywords
    : [];

  const jobs = await fetchJobsForKeywords(searchKeywords);
  if (jobs.length === 0) {
    return {
      error: "No live jobs were returned for the generated keywords.",
      search_keywords: searchKeywords,
      resume_skills: keywordPayload?.resume_skills || [],
    };
  }

  try {
    await fs.writeFile(jobsPath, JSON.stringify(jobs), "utf-8");
    const analysisCommand = rawText.trim()
      ? ["analyze-text", resumeTextPath, jobsPath]
      : ["analyze", filePath, jobsPath];
    const analysis = await runPythonPipeline(analysisCommand);

    return {
      ...analysis,
      search_keywords: analysis?.search_keywords || searchKeywords,
      resume_skills: analysis?.resume_skills || keywordPayload?.resume_skills || [],
      job_count: jobs.length,
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};
