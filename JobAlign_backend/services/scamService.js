import fs from "fs/promises";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { spawn } = require("child_process");

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
    candidates.push({ command: process.env.PYTHON_EXECUTABLE, prefixArgs: [] });
  }
  candidates.push({ command: BUNDLED_PYTHON_PATH, prefixArgs: [] });
  if (process.platform === "win32") {
    candidates.push({ command: "py", prefixArgs: ["-3"] });
  }
  candidates.push({ command: "python", prefixArgs: [] }, { command: "python3", prefixArgs: [] });
  return candidates;
})();

const parseJsonFromStdout = (stdout = "") => {
  const lines = String(stdout || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]);
    } catch {
      // Keep scanning upwards for the JSON line.
    }
  }

  throw new Error("Invalid JSON returned by scam check.");
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

    child.on("error", reject);
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

export const runResumeScamCheck = async ({ filePath = "", rawText = "" }) => {
  const pythonScript = `
import json
import sys
import types


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

from ml.scam_filtering.scam import analyze_with_llm, check_essential_info, check_structure, extract_text

raw_text_path = sys.argv[1]
file_path = sys.argv[2]

with open(raw_text_path, "r", encoding="utf-8") as handle:
    raw_text = handle.read()

text = raw_text.strip()
if not text and file_path:
    text = extract_text(file_path)

if not text or str(text).startswith("ERROR"):
    print(json.dumps({"error": text or "Resume text unavailable"}))
    sys.exit(0)

email, phone, links = check_essential_info(text)
sections = check_structure(text.lower())
llm_result = analyze_with_llm(text)

print(json.dumps({
    "total_words": len(text.split()),
    "contact_info": {
        "email": email,
        "phone": phone,
        "links": links
    },
    "sections_found": sections,
    "llm_analysis": llm_result
}))
`.trim();

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-align-scam-"));
  const rawTextPath = path.join(tempDir, "resume.txt");
  let lastError = null;

  try {
    await fs.writeFile(rawTextPath, rawText || "", "utf-8");

    for (const candidate of pythonCandidates) {
      try {
        return await runPythonCommand(candidate.command, [
          ...candidate.prefixArgs,
          "-c",
          pythonScript,
          rawTextPath,
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
