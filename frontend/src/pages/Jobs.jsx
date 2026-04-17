import JobCard from "../components/JobCard";

export default function Jobs() {
  const jobs = [
    {
      title: "Frontend Developer",
      company: "Google",
      location: "Remote",
      type: "Full-time",
      match: "91%",
      description: "Build polished product experiences with React, accessibility, and design systems.",
    },
    {
      title: "Backend Developer",
      company: "Amazon",
      location: "Bangalore",
      type: "Hybrid",
      match: "84%",
      description: "Design resilient APIs and data services for high-scale customer platforms.",
    },
    {
      title: "UI Engineer",
      company: "Figma",
      location: "Remote",
      type: "Full-time",
      match: "88%",
      description: "Partner with product teams to ship thoughtful, high-craft collaboration features.",
    },
    {
      title: "Product Engineer",
      company: "Notion",
      location: "Delhi",
      type: "On-site",
      match: "79%",
      description: "Blend frontend craft with fast iteration across product and platform surfaces.",
    },
  ];

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
              Review a tighter set of opportunities with better-fit signals, cleaner job context,
              and less time wasted on weak matches.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-teal-300">24</p>
              <p className="mt-2 text-sm text-slate-400">curated openings this week</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-orange-300">87%</p>
              <p className="mt-2 text-sm text-slate-400">average resume-to-role fit</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-cyan-300">6</p>
              <p className="mt-2 text-sm text-slate-400">priority applications today</p>
            </div>
          </div>
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
