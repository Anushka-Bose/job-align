import { useEffect, useMemo, useState } from "react";
import { getRecruiterJobs } from "../api/recruiter";
import JobCard from "../components/JobCard";

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || {};
  } catch {
    return {};
  }
};

export default function RecruiterJobs() {
  const user = useMemo(getCurrentUser, []);
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [company, setCompany] = useState(user.company || "");
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    let ignore = false;

    const loadJobs = async () => {
      if (!token) {
        setError("Please login again to view your company jobs.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await getRecruiterJobs({ token });
        if (ignore) return;

        const jobs = Array.isArray(data?.jobs)
          ? data.jobs.map((job) => ({
              title: job.title || "Untitled role",
              company: job.company || data?.company || user.company || "Your company",
              location: job.location || "Location unavailable",
              type: job.source || "Company role",
              match: "Company role",
              description: job.description || "Job description is not available.",
            }))
          : [];

        setCompany(data?.company || user.company || "");
        setJobs(jobs);
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Could not load company jobs.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadJobs();

    return () => {
      ignore = true;
    };
  }, [token, user.company]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-slate-200">
          Loading company jobs...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
              Company Jobs
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
              Jobs associated with {company || "your company"}.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Recruiter Explore Jobs now opens the stored job listings for this recruiter's company.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-3xl font-black text-teal-300">{jobs.length}</p>
            <p className="mt-2 text-sm text-slate-400">company jobs visible</p>
          </div>
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
            {error}
          </p>
        ) : null}
      </section>

      {!error ? (
        jobs.length ? (
          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {jobs.map((job) => (
              <div key={`${job.company}-${job.title}-${job.location}`} className="space-y-3">
                <JobCard {...job} showActions={false} />
              </div>
            ))}
          </section>
        ) : (
          <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6 text-slate-300">
            No jobs are currently stored for this company.
          </section>
        )
      ) : null}
    </main>
  );
}
