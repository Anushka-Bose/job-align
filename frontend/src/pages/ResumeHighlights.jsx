import { Link } from "react-router-dom";

const readLatestAnalysis = () => {
  try {
    return JSON.parse(localStorage.getItem("latestJobAnalysis") || "null");
  } catch {
    return null;
  }
};

const formatSignalScore = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  return number <= 1 ? `${Math.round(number * 100)}%` : `${Math.round(number)}%`;
};

const normalizeSignalScore = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number <= 1 ? number * 100 : number)));
};

const colorStyles = {
  red: {
    badge: "border-rose-300/25 bg-rose-400/15 text-rose-100",
    glow: "shadow-rose-500/10",
    rail: "from-rose-300 via-orange-300 to-amber-200",
    card: "border-rose-300/20 bg-slate-950/80",
    panel: "border-rose-300/20 bg-[linear-gradient(135deg,rgba(251,113,133,0.16),rgba(15,23,42,0.92))]",
  },
  green: {
    badge: "border-emerald-300/25 bg-emerald-400/15 text-emerald-100",
    glow: "shadow-emerald-500/10",
    rail: "from-emerald-300 via-teal-300 to-cyan-200",
    card: "border-emerald-300/20 bg-slate-950/80",
    panel: "border-emerald-300/20 bg-[linear-gradient(135deg,rgba(52,211,153,0.16),rgba(15,23,42,0.92))]",
  },
};

const typeLabels = {
  education: "Education Signal",
  skills: "Skills Signal",
  project: "Project Signal",
  problem_solving: "Problem Solving Signal",
  technical: "Technical Signal",
  general: "General Signal",
};

export default function ResumeHighlights() {
  const analysis = readLatestAnalysis();
  const highlights = Array.isArray(analysis?.highlights) ? analysis.highlights : [];
  const groupedHighlights = highlights.reduce((accumulator, item) => {
    const key = item?.type || "general";
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(item);
    return accumulator;
  }, {});
  const averageSignalScore = highlights.length
    ? Math.round(
      highlights.reduce((sum, item) => sum + normalizeSignalScore(item?.score), 0) / highlights.length
    )
    : 0;
  const suggestionsCount = highlights.filter((item) => item?.suggestion).length;
  const highlightTypes = Object.keys(groupedHighlights);

  if (!analysis) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10 text-white lg:px-10 lg:py-14">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
            Resume Highlights
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
            No highlight analysis is available yet.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Upload your resume first so the backend can generate flagged lines and improvement suggestions.
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
              Resume Highlights
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
              See which lines need improvement.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              These backend-generated highlights point to weaker resume lines and provide suggestions to strengthen them for the matched role.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/resume-score"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-semibold text-white transition hover:border-teal-300/40 hover:bg-white/[0.08]"
            >
              View Resume Score
            </Link>
            <Link
              to="/jobs"
              className="inline-flex items-center justify-center rounded-full bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300"
            >
              View matched jobs
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Highlighted Lines
            </p>
            <p className="mt-3 text-4xl font-black text-rose-200">{highlights.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Suggestions Ready
            </p>
            <p className="mt-3 text-4xl font-black text-emerald-200">{suggestionsCount}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Average Signal Score
            </p>
            <p className="mt-3 text-4xl font-black text-cyan-200">{averageSignalScore}%</p>
          </div>
        </div>

        {highlightTypes.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {highlightTypes.map((type) => (
              <span
                key={type}
                className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-slate-200"
              >
                {typeLabels[type] || type.replaceAll("_", " ")}: {groupedHighlights[type].length}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-6">
        {highlights.length ? (
          highlights.map((item, index) => {
            const normalizedColor = String(item.color || item.label || "red").toLowerCase();
            const palette = colorStyles[normalizedColor] || colorStyles.red;
            const signalScore = normalizeSignalScore(item.score);

            return (
            <article
              key={`${item.text}-${index}`}
              className={`overflow-hidden rounded-[1.75rem] border p-0 shadow-2xl shadow-black/30 ${palette.card} ${palette.glow}`}
            >
              <div className={`h-1 w-full bg-gradient-to-r ${palette.rail}`} />

              <div className="p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] ${palette.badge}`}>
                        {item.label || "Highlight"}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        {typeLabels[item.type] || String(item.type || "general").replaceAll("_", " ")}
                      </span>
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-white">
                      {typeLabels[item.type] || "Resume line review"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Focus area #{index + 1}
                    </p>
                  </div>
                  <div className="min-w-[220px] rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Signal score
                      </p>
                      <span className="text-lg font-black text-white">{formatSignalScore(item.score)}</span>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${palette.rail}`}
                        style={{ width: `${signalScore}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>Raw: {String(item.score ?? "N/A")}</span>
                      <span>{String(item.color || "red").toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className={`relative overflow-hidden rounded-[1.5rem] border p-5 ${colorStyles.red.panel}`}>
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-300 via-orange-300 to-amber-200" />
                    <p className="pl-3 text-sm uppercase tracking-[0.2em] text-rose-100/80">Flagged line</p>
                    <p className="mt-4 pl-3 text-base leading-8 text-rose-50">{item.text}</p>
                  </div>

                  <div className={`relative overflow-hidden rounded-[1.5rem] border p-5 ${colorStyles.green.panel}`}>
                    <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-300 via-teal-300 to-cyan-200" />
                    <p className="pl-3 text-sm uppercase tracking-[0.2em] text-emerald-100/80">Suggestion</p>
                    <p className="mt-4 pl-3 text-base leading-8 text-emerald-50">
                      {item.suggestion || "No suggestion returned."}
                    </p>
                  </div>
                </div>
              </div>
            </article>
            );
          })
          
        ) : (
          <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-7 shadow-xl shadow-black/30">
            <p className="text-lg font-semibold text-white">No highlight suggestions were returned.</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Your latest backend analysis did not flag any lines for rewrite suggestions.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
