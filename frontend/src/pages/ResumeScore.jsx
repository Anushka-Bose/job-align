import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { readLatestAnalysis, writeLatestAnalysis } from "../utils/analysisStorage";

const scoreCategories = [
  { key: "Impact", label: "Impact", color: "accent-teal-300" },
  { key: "Problem Solving", label: "Problem solving", color: "accent-cyan-300" },
  { key: "Technical/Domain Depth", label: "Tech/domain", color: "accent-orange-300" },
  { key: "Communication", label: "Communication", color: "accent-sky-300" },
  { key: "Leadership/Ownership", label: "Leadership + ownership", color: "accent-amber-300" },
  { key: "Analytical Thinking", label: "Analytical thinking", color: "accent-emerald-300" },
];

const clampScore = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const normalized = number <= 1 ? number * 100 : number;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

export default function ResumeScore() {
  const location = useLocation();
  const analysis = location.state?.uploadedAnalysis || readLatestAnalysis();

  useEffect(() => {
    if (location.state?.uploadedAnalysis) {
      writeLatestAnalysis(location.state.uploadedAnalysis);
    }
  }, [location.state]);

  const scores = analysis?.competencies || {};
  const overallScore = clampScore(analysis?.resume_score, 0);
  const matchSummary = analysis?.match_summary || null;
  const topJob = Array.isArray(analysis?.top_jobs) ? analysis.top_jobs[0] : null;
  const competencyGap = Array.isArray(analysis?.competency_gap) ? analysis.competency_gap : [];

  const categoryScores = scoreCategories.map((category) => ({
    ...category,
    value: clampScore(scores?.[category.key], 0),
  }));

  if (!analysis) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 text-white lg:px-10 lg:py-14">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
            Resume Analysis
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
            No resume analysis is available yet.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Upload your resume first to fetch the backend analysis and see your score breakdown.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/upload"
              className="inline-flex items-center justify-center rounded-full bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300"
            >
              Upload resume
            </Link>
            <Link
              to="/jobs"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-white transition hover:border-teal-300/40 hover:bg-white/[0.08]"
            >
              View jobs
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-white lg:px-10 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
              Resume Analysis
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
              Your resume score is ready.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Review the exact backend analysis for your uploaded resume and the signals hiring teams usually scan first.
            </p>
          </div>

          <Link
            to="/jobs"
            className="inline-flex items-center justify-center rounded-full bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300"
          >
            View matched jobs
          </Link>
          <Link
            to="/resume-highlights"
            state={{ uploadedAnalysis: analysis }}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-white transition hover:border-teal-300/40 hover:bg-white/[0.08]"
          >
            View highlights
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-7 shadow-xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Overall Score
          </p>
          <div className="mt-6 flex items-end gap-3">
            <span className="text-7xl font-black leading-none text-teal-300">{overallScore}</span>
            <span className="pb-2 text-2xl font-bold text-slate-400">/100</span>
          </div>
          <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-300 via-cyan-300 to-orange-300"
              style={{ width: `${overallScore}%` }}
            />
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-400">
            This score summarizes how strongly your resume presents role fit, depth, and evidence of execution.
          </p>
          {matchSummary ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              <p className="font-semibold text-white">{matchSummary.best_job_title || "Top matched job"}</p>
              <p className="mt-2">{matchSummary.message}</p>
            </div>
          ) : null}
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-7 shadow-xl shadow-black/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                Score Breakdown
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">Resume signal sliders</h2>
            </div>
            <p className="text-sm text-slate-500">0 to 100</p>
          </div>

          <div className="mt-7 grid gap-6">
            {categoryScores.map((category) => (
              <div key={category.key}>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <label htmlFor={category.key} className="text-sm font-semibold text-slate-200">
                    {category.label}
                  </label>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-bold text-white">
                    {category.value}
                  </span>
                </div>
                <input
                  id={category.key}
                  type="range"
                  min="0"
                  max="100"
                  value={category.value}
                  readOnly
                  aria-label={`${category.label} score`}
                  className={`h-2 w-full cursor-default ${category.color}`}
                />
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-7 shadow-xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Match Summary
          </p>
          <div className="mt-5 grid gap-3 text-sm text-slate-300">
            <p>
              Best job: <span className="font-semibold text-white">{matchSummary?.best_job_title || topJob?.title || "Not available"}</span>
            </p>
            <p>
              Experience level: <span className="font-semibold text-white">{matchSummary?.candidate_experience_level || "Not available"}</span>
            </p>
            <p>
              Candidate experience: <span className="font-semibold text-white">{matchSummary?.candidate_experience_years ?? "N/A"}</span>
            </p>
            <p>
              Required experience: <span className="font-semibold text-white">{matchSummary?.required_experience_years ?? "Not specified"}</span>
            </p>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-7 shadow-xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Competency Gap
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {competencyGap.length ? (
              competencyGap.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100"
                >
                  {item}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-400">No competency gaps were returned by the backend analysis.</p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
