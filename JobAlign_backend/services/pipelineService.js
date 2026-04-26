import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { extractSkills, fetchJobsFromApi } from "./jobService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
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

const DEFAULT_SEARCH_KEYWORDS = [
  "software developer",
  "backend developer",
  "frontend developer",
  "full stack developer",
];
const DEFAULT_PREFERRED_LOCATION = process.env.DEFAULT_JOB_LOCATION || "India";

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

const parseJsonFromStdout = (stdout = "") => {
  const trimmed = String(stdout || "").trim();
  if (!trimmed) {
    throw new Error("Pipeline returned no output.");
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Keep scanning upward until we find the JSON payload.
    }
  }

  throw new Error(`Invalid JSON returned by pipeline: ${trimmed}`);
};

const buildSearchKeywords = (rawText = "") => {
  const resumeSkills = extractSkills(rawText);

  if (!resumeSkills.length) {
    return {
      resumeSkills: [],
      searchKeywords: DEFAULT_SEARCH_KEYWORDS,
    };
  }

  const searchKeywords = uniqueValues([
    resumeSkills.slice(0, 3).join(" "),
    ...resumeSkills.slice(0, 5).map((skill) => `${skill} developer`),
    ...resumeSkills.slice(0, 2).map((skill) => `${skill} engineer`),
  ]).slice(0, 5);

  return {
    resumeSkills,
    searchKeywords: searchKeywords.length ? searchKeywords : DEFAULT_SEARCH_KEYWORDS,
  };
};

const runPythonCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
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
        resolve(parseJsonFromStdout(stdout));
      } catch (error) {
        reject(error);
      }
    });
  });

const runPythonPipeline = async ({ filePath, rawText, jobs }) => {
  const pythonScript = `
import json
import sys
import types
from pathlib import Path


def _install_google_genai_compat():
    try:
        from google import genai  # noqa: F401
        return
    except Exception:
        pass

    try:
        import google.generativeai as legacy_genai
        import google
    except Exception:
        return

    class _CompatModels:
        def __init__(self, api_key):
            legacy_genai.configure(api_key=api_key)

        def generate_content(self, model, contents):
            response = legacy_genai.GenerativeModel(model).generate_content(contents)
            return types.SimpleNamespace(text=getattr(response, "text", "") or "")

    class _CompatClient:
        def __init__(self, api_key=None):
            self.models = _CompatModels(api_key)

    compat_module = types.ModuleType("google.genai")
    compat_module.Client = _CompatClient
    sys.modules["google.genai"] = compat_module
    google.genai = compat_module


_install_google_genai_compat()

from ml.pipeline import process_resume_pdf, run_pipeline

jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
raw_text = Path(sys.argv[2]).read_text(encoding="utf-8")
file_path = sys.argv[3]

try:
    if raw_text.strip():
        result = run_pipeline(raw_text, jobs)
    else:
        result = process_resume_pdf(file_path, jobs)
except Exception as exc:
    result = {"error": f"{type(exc).__name__}: {exc}"}

print(json.dumps(result))
`.trim();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-align-pipeline-"));
  const jobsPath = path.join(tempDir, "jobs.json");
  const resumeTextPath = path.join(tempDir, "resume.txt");
  let lastError = null;

  try {
    await fs.writeFile(jobsPath, JSON.stringify(jobs || []), "utf-8");
    await fs.writeFile(resumeTextPath, rawText || "", "utf-8");

    for (const candidate of pythonCandidates) {
      try {
        return await runPythonCommand(candidate.command, [
          ...candidate.prefixArgs,
          "-c",
          pythonScript,
          jobsPath,
          resumeTextPath,
          filePath || "",
        ]);
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
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  throw lastError || new Error("Python executable not found.");
};

export const runResumePipeline = async (filePath, rawText = "") => {
  const { resumeSkills, searchKeywords } = buildSearchKeywords(rawText);
  const jobs = await fetchJobsFromApi(searchKeywords, {
    preferredLocation: DEFAULT_PREFERRED_LOCATION,
  });

  if (jobs.length === 0) {
    return {
      error: "No live jobs were returned for the generated keywords.",
      search_keywords: searchKeywords,
      resume_skills: resumeSkills,
    };
  }

  const analysis = await runPythonPipeline({
    filePath,
    rawText,
    jobs,
  });

  return {
    ...analysis,
    search_keywords: searchKeywords,
    resume_skills: resumeSkills,
    job_count: jobs.length,
  };
};
