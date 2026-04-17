import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const highlights = [
  { value: "10k+", label: "role matches tracked" },
  { value: "92%", label: "resume parsing accuracy" },
  { value: "3 min", label: "average screening time" },
];

const features = [
  {
    title: "Smart Resume Screening",
    description:
      "Upload your resume and let Smart Align AI detect strengths, keywords, and role alignment in seconds.",
  },
  {
    title: "Tailored Job Discovery",
    description:
      "Surface openings that match your experience instead of making you dig through endless listings.",
  },
  {
    title: "Clear Next Steps",
    description:
      "See where you fit best, what to improve, and which jobs are worth applying to first.",
  },
];

const steps = [
  "Upload your resume or create your profile.",
  "Let Smart Align AI analyze your skills and experience.",
  "Review curated job opportunities and apply faster.",
];

export default function Home({ isAuthenticated = false }) {
  const stepsText = [
    "Parsing resume...",
    "Matching skills...",
    "Calculating score...",
  ];
  const scoreTargets = [0, 42, 86];
  const scanSignals = [
    {
      label: "Document Parse",
      title: "Contact and experience blocks detected",
      note: "Reading sections, dates, and role history from the sample CV.",
    },
    {
      label: "Skill Signal",
      title: "React + Tailwind identified",
      note: "Cross-matching tools, frameworks, and UI keywords with role requirements.",
    },
    {
      label: "Role Fit",
      title: "Frontend profile scored at 86%",
      note: "Final recommendation favors UI engineering and product-focused frontend roles.",
    },
  ];
  const nextMoves = [
    {
      label: "Next Step Queue",
      title: "Extract resume sections for structured analysis",
      note: "Separating summary, skills, projects, and experience into searchable blocks.",
    },
    {
      label: "Next Step Queue",
      title: "Map frameworks to likely frontend job families",
      note: "Prioritizing UI, frontend, and product-facing engineering roles from detected skills.",
    },
    {
      label: "Best next move",
      title: "Apply to product-focused frontend and UI engineering roles.",
      note: "Strongest alignment comes from interface-heavy teams using React, JavaScript, and design systems.",
    },
  ];
  const recommendations = [
    {
      label: "AI Recommendation",
      title: "Resume structure is clear enough for full parsing.",
      note: "The sample CV has recognizable section headers and readable experience formatting.",
    },
    {
      label: "AI Recommendation",
      title: "Frontend stack shows the highest confidence signal.",
      note: "Skill matching is strongest around React, Tailwind, and UI implementation patterns.",
    },
    {
      label: "AI Recommendation",
      title: "Resume aligns best with frontend, UI, and product engineering teams.",
      note: "The final score settles at 86%, with the clearest fit in interface-focused roles.",
    },
  ];

  const [stepIndex, setStepIndex] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const durations = [2200, 2200, 3600];
    const timeout = setTimeout(() => {
      setStepIndex((prev) => (prev + 1) % stepsText.length);
    }, durations[stepIndex]);

    return () => clearTimeout(timeout);
  }, [stepIndex, stepsText.length]);

  useEffect(() => {
    const target = scoreTargets[stepIndex];
    if (target < displayScore) {
      setDisplayScore(target);
      return undefined;
    }

    const interval = setInterval(() => {
      setDisplayScore((prev) => {
        if (prev === target) return prev;

        const next = prev + Math.max(1, Math.ceil((target - prev) / 8));
        return Math.min(target, next);
      });
    }, 70);

    return () => clearInterval(interval);
  }, [displayScore, stepIndex]);

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.18),_transparent_30%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-4xl text-center lg:text-center">
            <span className="inline-flex rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1 text-sm font-medium text-teal-200">
              AI-powered hiring clarity for job seekers
            </span>

            <h1 className="mt-6 text-4xl font-black leading-tight text-white md:text-6xl">
              Turn your resume into a sharper path to the right role.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Smart Align AI helps you screen your profile, identify stronger matches, and focus on
              opportunities where your skills actually stand out.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:mx-auto sm:w-fit sm:flex-row">
              {!isAuthenticated ? (
                <Link
                  to="/signup"
                  className="rounded-full bg-teal-400 px-6 py-3 text-center font-semibold text-slate-950 transition hover:bg-teal-300"
                >
                  Get Started
                </Link>
              ) : null}
              <Link
                to="/jobs"
                className="rounded-full border border-white/20 px-6 py-3 text-center font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
              >
                Explore Jobs
              </Link>
            </div>
          </div>

          <div className="profile-insight-card relative mt-12 w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-teal-500/10 backdrop-blur lg:mt-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_42%)]" />
            <div className="pointer-events-none absolute inset-y-6 left-6 w-px bg-gradient-to-b from-transparent via-teal-300/60 to-transparent opacity-70" />

            <div className="relative rounded-[1.5rem] border border-white/6 bg-slate-900/95 p-6">
              <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] border border-teal-300/10" />
              <div className="pointer-events-none absolute inset-x-10 top-0 h-20 bg-teal-400/12 blur-3xl" />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
                    Sample Profile Insight
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Frontend Developer Fit</h2>
                </div>
                <div className="score-pill rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-300">
                  {displayScore}% Match
                </div>
              </div>

              <div className="scan-line" />
              <div className="scan-glow" />
              <div className="scan-spark" />

              <div className="status-panel mt-6 rounded-2xl border border-teal-400/20 bg-teal-400/10 px-4 py-3">
                <div className="flex items-center gap-3 text-sm font-medium text-teal-200">
                  <span className="status-dot h-2.5 w-2.5 rounded-full bg-teal-300" />
                  <span>{stepsText[stepIndex]}</span>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="resume-preview data-panel relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-3">
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-teal-300/10" />
                  <img
                    src="/resume.jpg"
                    alt="Sample resume preview"
                    className="h-[32rem] w-full rounded-[1.2rem] bg-white p-2 object-contain object-center xl:h-[38rem]"
                  />

                  <div className="pointer-events-none absolute inset-3 rounded-[1.2rem] border border-white/10" />

                  <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-teal-300/30 bg-slate-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-teal-200 shadow-lg shadow-teal-500/20">
                    Sample CV
                  </div>

                  <div
                    className={`insight-chip absolute right-5 top-20 rounded-2xl border border-teal-300/25 bg-slate-950/85 px-4 py-3 shadow-lg shadow-teal-500/20 ${
                      stepIndex >= 0 ? "is-visible" : ""
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Document Parse</p>
                    <p className="mt-1 text-sm font-semibold text-white">Experience blocks found</p>
                  </div>

                  <div
                    className={`insight-chip absolute right-6 bottom-24 rounded-2xl border border-cyan-300/20 bg-slate-950/85 px-4 py-3 shadow-lg shadow-cyan-500/10 ${
                      stepIndex >= 1 ? "is-visible" : ""
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Skill Signal</p>
                    <p className="mt-1 text-sm font-semibold text-white">React + Tailwind</p>
                  </div>

                  <div
                    className={`insight-chip absolute bottom-14 left-5 rounded-2xl border border-emerald-300/20 bg-slate-950/85 px-4 py-3 shadow-lg shadow-emerald-500/10 ${
                      stepIndex >= 2 ? "is-visible" : ""
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Role Fit</p>
                    <p className="mt-1 text-sm font-semibold text-white">Frontend {displayScore}% Match</p>
                  </div>
                </div>

                <div className="flex h-full flex-col justify-center gap-4 xl:pl-3">
                  <div className="data-panel max-w-[30rem] rounded-2xl bg-slate-800/80 p-4 xl:-ml-2">
                    <p className="text-sm text-slate-400">{scanSignals[stepIndex].label}</p>
                    <p className="mt-2 text-lg font-semibold">{scanSignals[stepIndex].title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{scanSignals[stepIndex].note}</p>
                  </div>
                  <div className="data-panel max-w-[28rem] rounded-2xl bg-slate-800/80 p-4 xl:ml-8">
                    <p className="text-sm text-slate-400">{nextMoves[stepIndex].label}</p>
                    <p className="mt-2 text-lg font-semibold">{nextMoves[stepIndex].title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{nextMoves[stepIndex].note}</p>
                  </div>
                  <div className="data-panel max-w-[31rem] rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 xl:ml-3">
                    <p className="text-sm text-emerald-200/80">{recommendations[stepIndex].label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{recommendations[stepIndex].title}</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-50/85">{recommendations[stepIndex].note}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {highlights.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/5 bg-slate-800/70 p-4"
                  >
                    <p className="text-2xl font-bold text-teal-300">{item.value}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-teal-300/30 hover:bg-white/[0.05]"
            >
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-teal-300 to-orange-400" />
              <h3 className="mt-5 text-xl font-semibold">{feature.title}</h3>
              <p className="mt-3 leading-7 text-slate-300">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-bold">A cleaner, faster route from resume to role</h2>
            <p className="mt-4 max-w-2xl leading-7 text-slate-300">
              Instead of manually guessing which jobs fit, use your resume as the starting point
              and move through a guided flow built for clarity.
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-950">
                  0{index + 1}
                </span>
                <p className="pt-2 text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
