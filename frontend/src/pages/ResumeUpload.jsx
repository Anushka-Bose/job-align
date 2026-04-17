import { useState } from "react";

export default function ResumeUpload() {
  const [file, setFile] = useState(null);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 lg:px-10 lg:py-14">
      <section className="grid gap-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
            Resume Intake
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white">
            Upload once, then let JobAI read the signal.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Add your resume to unlock skill detection, match scoring, and a more focused job list
            based on what you already do well.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Step 1
              </p>
              <p className="mt-3 text-slate-200">Upload your latest PDF or DOC resume.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Step 2
              </p>
              <p className="mt-3 text-slate-200">Let the platform map skills and likely-fit roles.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Step 3
              </p>
              <p className="mt-3 text-slate-200">Use the refreshed job matches to prioritize applications.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-black/30">
          <h2 className="text-2xl font-bold text-white">Upload Resume</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Choose your resume file to start generating profile insights.
          </p>

          <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center transition hover:border-teal-300/60 hover:bg-white/[0.05]">
            <span className="text-lg font-semibold text-slate-100">Drop a file here or browse</span>
            <span className="mt-2 text-sm text-slate-400">PDF, DOC, DOCX up to 10MB</span>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
            />
          </label>

          <button className="mt-6 w-full rounded-full bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300">
            Submit Resume
          </button>

          {file && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm text-slate-400">Selected file</p>
              <p className="mt-1 font-medium text-white">{file.name}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
