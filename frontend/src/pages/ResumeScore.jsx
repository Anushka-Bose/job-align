import { Link } from "react-router-dom";

const scoreCategories = [
  { key: "impact", label: "Impact", fallback: 82, color: "accent-teal-300" },
  { key: "problemSolving", label: "Problem solving", fallback: 76, color: "accent-cyan-300" },
  { key: "techDomain", label: "Tech/domain", fallback: 88, color: "accent-orange-300" },
  { key: "communication", label: "Communication", fallback: 72, color: "accent-sky-300" },
  { key: "leadershipOwnership", label: "Leadership + ownership", fallback: 79, color: "accent-amber-300" },
  { key: "analyticalThinking", label: "Analytical thinking", fallback: 84, color: "accent-emerald-300" },
];

const readLatestAnalysis = () => {
  try {
    return JSON.parse(localStorage.getItem("latestJobAnalysis") || "null");
  } catch {
    return null;
  }
};

const clampScore = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const normalized = number <= 1 ? number * 100 : number;
  return Math.max(0, Math.min(100, Math.round(normalized)));
};

const pickScore = (analysis, keys, fallback) => {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], analysis);
    if (value !== undefined && value !== null) {
      return clampScore(value, fallback);
    }
  }

  return fallback;
};

export default function ResumeScore() {
  const analysis = readLatestAnalysis();
  const scores = analysis?.scores || analysis?.categoryScores || analysis?.dimensions || {};
  const overallScore = pickScore(
    analysis,
    ["overallScore", "score", "pipelineScore", "matchScore", "eligibilityScore"],
    81
  );

  const categoryScores = scoreCategories.map((category) => ({
    ...category,
    value: pickScore(
      scores,
      [
        category.key,
        category.label,
        category.label.toLowerCase(),
        category.label.toLowerCase().replaceAll(" ", "_").replace("+", "plus"),
      ],
      category.fallback
    ),
  }));

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
              Review your overall profile strength and the signals hiring teams usually scan first.
            </p>
          </div>

          <Link
            to="/jobs"
            className="inline-flex items-center justify-center rounded-full bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300"
          >
            View matched jobs
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
    </main>
  );
}
