export default function JobCard({ title, company, location, type, match, description }) {
  return (
    <article className="group rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-teal-300/40 hover:shadow-teal-500/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">{company}</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{title}</h2>
        </div>
        <span className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-300">
          {match} Match
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">{location}</span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">{type}</span>
      </div>

      <p className="mt-5 leading-7 text-slate-300">{description}</p>

      <div className="mt-6 flex gap-3">
        <button className="rounded-full bg-teal-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-300">
          Apply Now
        </button>
        <button className="rounded-full border border-white/15 px-5 py-3 font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10 hover:text-white">
          Save Role
        </button>
      </div>
    </article>
  );
}
