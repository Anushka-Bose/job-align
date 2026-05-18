import { useMemo, useState } from "react";
import { FaEye, FaFilter, FaRobot } from "react-icons/fa";

const sampleApplicants = [
  {
    id: "maya-frontend",
    name: "Maya Rao",
    email: "maya.rao@example.com",
    targetRole: "Frontend Developer",
    location: "Remote",
    skills: ["React", "TypeScript", "Accessibility", "Design Systems"],
    matchScore: 96,
    experience: "4 years",
    status: "Interview ready",
  },
  {
    id: "arjun-backend",
    name: "Arjun Mehta",
    email: "arjun.mehta@example.com",
    targetRole: "Backend Developer",
    location: "Bangalore",
    skills: ["Node.js", "PostgreSQL", "AWS", "APIs"],
    matchScore: 91,
    experience: "5 years",
    status: "Strong shortlist",
  },
  {
    id: "nisha-product",
    name: "Nisha Kapoor",
    email: "nisha.kapoor@example.com",
    targetRole: "Product Engineer",
    location: "Delhi",
    skills: ["React", "Python", "Experimentation", "UX"],
    matchScore: 88,
    experience: "3 years",
    status: "Needs review",
  },
  {
    id: "danish-ui",
    name: "Danish Khan",
    email: "danish.khan@example.com",
    targetRole: "UI Engineer",
    location: "Remote",
    skills: ["Figma", "React", "CSS", "Motion"],
    matchScore: 84,
    experience: "2 years",
    status: "Portfolio pending",
  },
];

const roleOptions = ["All roles", "Frontend Developer", "Backend Developer", "Product Engineer", "UI Engineer"];

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
};

const getStoredApplicants = () => {
  try {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    return users
      .filter((user) => (user.role || "job applicant") === "job applicant")
      .map((user, index) => ({
        id: `stored-${user.email || index}`,
        name: user.name || "Unnamed Applicant",
        email: user.email || "No email added",
        targetRole: user.targetRole || roleOptions[(index % (roleOptions.length - 1)) + 1],
        location: user.location || "Open to opportunities",
        skills: user.skills || ["Resume screening", "Communication", "Problem solving"],
        matchScore: user.matchScore || 78 + ((index * 7) % 17),
        experience: user.experience || "Profile pending",
        status: "New applicant",
      }));
  } catch {
    return [];
  }
};

export default function RecruiterDashboard() {
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [sortOrder, setSortOrder] = useState("high-to-low");
  const user = getCurrentUser();

  const applicants = useMemo(() => {
    const mergedApplicants = [...sampleApplicants, ...getStoredApplicants()];
    const uniqueApplicants = Array.from(
      new Map(mergedApplicants.map((applicant) => [applicant.email, applicant])).values()
    );

    return uniqueApplicants
      .filter((applicant) => roleFilter === "All roles" || applicant.targetRole === roleFilter)
      .sort((a, b) =>
        sortOrder === "high-to-low" ? b.matchScore - a.matchScore : a.matchScore - b.matchScore
      );
  }, [roleFilter, sortOrder]);

  const [selectedApplicantId, setSelectedApplicantId] = useState(sampleApplicants[0].id);
  const selectedApplicant =
    applicants.find((applicant) => applicant.id === selectedApplicantId) || applicants[0];
  const topMatchScore = applicants.reduce(
    (highestScore, applicant) => Math.max(highestScore, applicant.matchScore),
    0
  );
  const firstName = user.name?.trim().split(" ")[0] || "recruiter";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-white lg:px-10 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
              Recruiter Dashboard
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
              Welcome {firstName} to Job Align.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Review ranked applicant profiles, filter by target role, and open each profile for a
              quick screening snapshot.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-teal-300">{applicants.length}</p>
              <p className="mt-2 text-sm text-slate-400">visible applicants</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-orange-300">{topMatchScore}%</p>
              <p className="mt-2 text-sm text-slate-400">top match score</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-cyan-300">
                {new Set(applicants.map((applicant) => applicant.targetRole)).size}
              </p>
              <p className="mt-2 text-sm text-slate-400">roles in shortlist</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
                Applicant Leaderboard
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">Filtered candidate ranking</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Role
                </span>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-teal-300"
                >
                  {roleOptions.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Sort
                </span>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-teal-300"
                >
                  <option value="high-to-low">Highest match first</option>
                  <option value="low-to-high">Lowest match first</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {applicants.map((applicant, index) => (
              <button
                key={applicant.id}
                type="button"
                onClick={() => setSelectedApplicantId(applicant.id)}
                className={`w-full rounded-[1.5rem] border p-4 text-left transition hover:border-teal-300/60 hover:bg-white/[0.06] ${
                  selectedApplicant?.id === applicant.id
                    ? "border-teal-300 bg-teal-400/10"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">
                      #{index + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{applicant.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {applicant.targetRole} · {applicant.location}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-2xl font-black text-teal-300">{applicant.matchScore}%</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Match
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {applicants.length === 0 && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 text-slate-300">
                No applicants match this filter yet.
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-teal-500/10">
          {selectedApplicant ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-200">
                Profile Snapshot
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">{selectedApplicant.name}</h2>
              <p className="mt-2 text-sm text-slate-400">{selectedApplicant.email}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-400">Target role</p>
                  <p className="mt-2 font-semibold text-white">{selectedApplicant.targetRole}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-400">Experience</p>
                  <p className="mt-2 font-semibold text-white">{selectedApplicant.experience}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-400">Screening status</p>
                  <p className="mt-2 font-semibold text-white">{selectedApplicant.status}</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Skills
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedApplicant.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-3 rounded-full bg-teal-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-300"
                >
                  <FaEye />
                  View Resume
                </button>
                {/*<button
                  type="button"
                  className="flex items-center justify-center gap-3 rounded-full border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/15"
                >
                  <FaRobot />
                  AI Detection
                </button>*/}
                <button
                  type="button"
                  className="flex items-center justify-center gap-3 rounded-full border border-orange-300/40 bg-orange-300/10 px-5 py-3 font-semibold text-orange-100 transition hover:border-orange-200 hover:bg-orange-300/15"
                >
                  <FaFilter />
                  Scam Filtering
                </button>
              </div>
            </>
          ) : (
            <p className="text-slate-300">Select an applicant to view their profile.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
