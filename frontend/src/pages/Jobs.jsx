import { useMemo } from "react";
import JobCard from "../components/JobCard";

const fallbackJobs = [
  {
    title: "Frontend Developer",
    company: "Google",
    location: "Remote",
    type: "Full-time",
    match: "91%",
    description: "Build polished product experiences with React, accessibility, and design systems."
  },
  {
    title: "Backend Developer",
    company: "Amazon",
    location: "Bangalore",
    type: "Hybrid",
    match: "84%",
    description: "Design resilient APIs and data services for high-scale customer platforms."
  },
  {
    title: "UI Engineer",
    company: "Figma",
    location: "Remote",
    type: "Full-time",
    match: "88%",
    description: "Partner with product teams to ship thoughtful, high-craft collaboration features."
  },
  {
    title: "Product Engineer",
    company: "Notion",
    location: "Delhi",
    type: "On-site",
    match: "79%",
    description: "Blend frontend craft with fast iteration across product and platform surfaces."
  }
];

const formatMatch = (score) => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return "N/A";

  const normalized = numericScore <= 1 ? numericScore * 100 : numericScore;
  const percentage = Math.max(0, Math.min(100, Math.round(normalized)));
  return `${percentage}%`;
};

export default function Jobs() {
  const analysis = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("latestJobAnalysis") || "null");
    } catch {
      return null;
    }
  }, []);

  const jobs = useMemo(() => {
    const storedMatches = analysis?.top_jobs;
    if (!Array.isArray(storedMatches) || storedMatches.length === 0) {
      return fallbackJobs;
    }

    return storedMatches.map((job, index) => ({
      title: job.title || `Matched Role ${index + 1}`,
      company: job.company || "Recommended Company",
      location: job.location || "Remote/Hybrid",
      type: job.type || "Recommended",
      match: formatMatch(
        typeof job.score === "number" ? job.score : job.similarity_score
      ),
      description:
        job.description || "Matched from your uploaded resume using skill and semantic analysis.",
      redirectUrl: job.redirect_url,
      searchQuery: job.search_query,
    }));
  }, [analysis]);

  const averageMatch = useMemo(() => {
    const percentages = jobs
      .map((job) => Number.parseInt(String(job.match).replace("%", ""), 10))
      .filter((score) => Number.isFinite(score));

    if (percentages.length === 0) {
      return "N/A";
    }

    return `${Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)}%`;
  }, [jobs]);

  const keywords = analysis?.search_keywords || [];
  const skillGap = analysis?.skill_gap || [];
  const highlights = analysis?.highlights || [];

  const highlightStyles = {
    GREEN: "border-emerald-300/20 bg-emerald-400/10 text-emerald-50",
    YELLOW: "border-amber-300/20 bg-amber-400/10 text-amber-50",
    RED: "border-rose-300/20 bg-rose-400/10 text-rose-50",
    NEUTRAL: "border-white/10 bg-white/[0.03] text-slate-200",
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
              Matched Opportunities
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
              Roles aligned with your profile and momentum.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Review live roles fetched from the job API, ranked by the resume pipeline against your uploaded profile.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-teal-300">{analysis?.job_count || jobs.length}</p>
              <p className="mt-2 text-sm text-slate-400">live jobs fetched from the API</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-orange-300">{averageMatch}</p>
              <p className="mt-2 text-sm text-slate-400">average resume-to-role fit</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-cyan-300">{analysis?.resume_score ?? Math.min(jobs.length, 6)}</p>
              <p className="mt-2 text-sm text-slate-400">resume score for the top role</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Search Keywords
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {keywords.length ? (
              keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-100"
                >
                  {keyword}
                </span>
              ))
            ) : (
              <p className="text-slate-400">Upload a resume to generate live job searches.</p>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Skill Gap
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {skillGap.length ? (
              skillGap.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-slate-400">No major skill gaps detected for the top match.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
          Resume Highlights
        </p>
        <div className="mt-4 grid gap-4">
          {highlights.length ? (
            highlights.map((item, index) => (
              <article
                key={`${item.label}-${index}`}
                className={`rounded-2xl border p-4 ${highlightStyles[item.label] || highlightStyles.NEUTRAL}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em]">{item.label}</p>
                </div>
                <p className="mt-3 leading-7">{item.text}</p>
                {item.suggestion ? (
                  <p className="mt-3 text-sm opacity-90">{item.suggestion}</p>
                ) : null}
              </article>
            ))
          ) : (
            <p className="text-slate-400">Upload a resume to see sentence-level green, yellow, and red feedback.</p>
          )}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={`${job.company}-${job.title}`} {...job} />
        ))}
      </section>
    </main>
  );
}
