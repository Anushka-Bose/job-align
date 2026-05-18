const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
};

export default function ApplicantDashboard() {
  const user = getCurrentUser();
  const firstName = user.name?.trim().split(" ")[0] || "there";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-white lg:px-10 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
          Applicant Dashboard
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
          Welcome {firstName} to Job Align.
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
          Your workspace is ready for resume updates, matched jobs, and application momentum.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-3xl font-black text-teal-300">87%</p>
            <p className="mt-2 text-sm text-slate-400">average role alignment</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-3xl font-black text-orange-300">6</p>
            <p className="mt-2 text-sm text-slate-400">priority applications</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-3xl font-black text-cyan-300">12</p>
            <p className="mt-2 text-sm text-slate-400">recommended jobs</p>
          </div>
        </div>
      </section>
    </main>
  );
}
