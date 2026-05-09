import { useEffect, useMemo, useState } from "react";
import JobCard from "../components/JobCard";
import { getCandidateJobFeed } from "../api/feed";
import { getRecruiterLeaderboard, runRecruiterScamCheck } from "../api/recruiter";
import { getNotifications, markNotificationRead } from "../api/notifications";

const fallbackJobs = [
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
];

const formatPercentage = (score) => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return "N/A";
  const normalized = numericScore <= 1 ? numericScore * 100 : numericScore;
  return `${Math.max(0, Math.min(100, Math.round(normalized)))}%`;
};

const parseStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export default function Jobs() {
  const [candidateFeed, setCandidateFeed] = useState(null);
  const [recruiterFeed, setRecruiterFeed] = useState(null);
  const [scamChecks, setScamChecks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingCandidateId, setCheckingCandidateId] = useState("");
  const [notificationFeed, setNotificationFeed] = useState({ unreadCount: 0, notifications: [] });

  const user = useMemo(parseStoredUser, []);
  const token = localStorage.getItem("token");
  const isRecruiter = user?.role === "recruiter";

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!token || !user?.id) {
        setError("Please login again to view your dashboard.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        if (isRecruiter) {
          const data = await getRecruiterLeaderboard({ token });
          if (!ignore) {
            setRecruiterFeed(data);
          }
          return;
        }

        const data = await getCandidateJobFeed({
          userId: user.id,
          token,
        });
        if (!ignore) {
          setCandidateFeed(data);
          try {
            const notifications = await getNotifications({ token });
            if (!ignore) {
              setNotificationFeed(notifications);
            }
          } catch {
            if (!ignore) {
              setNotificationFeed({ unreadCount: 0, notifications: [] });
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Could not load dashboard data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [isRecruiter, token, user?.id]);

  const candidateJobs = useMemo(() => {
    const jobs = candidateFeed?.jobs;
    if (!Array.isArray(jobs) || !jobs.length) {
      return fallbackJobs;
    }

    return jobs.map((job) => ({
      title: job.title || "Matched Role",
      company: job.company || "Recommended Company",
      location: job.location || "Remote",
      type: job.type || "Recommended",
      match: formatPercentage(job.matchScore),
      description: job.description || "Matched from your uploaded resume and skill profile.",
      redirectUrl: job.redirectUrl,
    }));
  }, [candidateFeed]);

  const averageMatch = useMemo(() => {
    const source = isRecruiter ? recruiterFeed?.candidates || [] : candidateJobs;
    const scores = source
      .map((item) => {
        if (isRecruiter) return Number(item.pipelineScore);
        return Number.parseInt(String(item.match).replace("%", ""), 10);
      })
      .filter((value) => Number.isFinite(value));

    if (!scores.length) return "N/A";
    return `${Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)}%`;
  }, [candidateJobs, isRecruiter, recruiterFeed]);

  const handleScamCheck = async (candidateId) => {
    setCheckingCandidateId(candidateId);

    try {
      const data = await runRecruiterScamCheck({ candidateId, token });
      setScamChecks((current) => ({
        ...current,
        [candidateId]: data.scamCheck,
      }));
    } catch (err) {
      setScamChecks((current) => ({
        ...current,
        [candidateId]: {
          error: err.message || "Scam check failed.",
        },
      }));
    } finally {
      setCheckingCandidateId("");
    }
  };

  const candidateKeywords = candidateFeed?.searchQueries || [];
  const resumeSkills = candidateFeed?.resumeSkills || [];
  const leaderboard = recruiterFeed?.candidates || [];

  const handleNotificationOpen = async (notification) => {
    try {
      if (!notification.isRead) {
        await markNotificationRead({
          token,
          notificationId: notification._id,
        });
        setNotificationFeed((current) => ({
          unreadCount: Math.max(0, (current.unreadCount || 0) - 1),
          notifications: current.notifications.map((item) =>
            item._id === notification._id ? { ...item, isRead: true } : item
          ),
        }));
      }
    } catch {
      // Do not block navigation on read-marking failure.
    }

    if (notification.redirectUrl) {
      window.open(notification.redirectUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-slate-200">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
              {isRecruiter ? "Recruiter Leaderboard" : "Matched Opportunities"}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
              {isRecruiter
                ? `Candidates eligible for ${recruiterFeed?.company || user?.company || "your company"} jobs.`
                : "Roles aligned with your profile and momentum."}
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              {isRecruiter
                ? "This leaderboard only includes candidates whose resumes match jobs created by your company, ranked by the pipeline score."
                : "Review jobs ranked against your latest uploaded resume and extracted skills."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-teal-300">
                {isRecruiter ? recruiterFeed?.totalJobs || 0 : candidateFeed?.totalActiveJobs || candidateJobs.length}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {isRecruiter ? "jobs owned by your company" : "jobs considered for your feed"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-orange-300">{averageMatch}</p>
              <p className="mt-2 text-sm text-slate-400">
                {isRecruiter ? "average candidate pipeline score" : "average resume-to-role fit"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-cyan-300">
                {isRecruiter ? leaderboard.length : candidateFeed?.filteredJobs ?? candidateJobs.length}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {isRecruiter ? "eligible candidates on the board" : "ranked roles returned"}
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
            {error}
          </p>
        ) : null}
      </section>

      {isRecruiter ? (
        <section className="mt-8 grid gap-5">
          {leaderboard.length ? (
            leaderboard.map((candidate, index) => {
              const scamCheck = scamChecks[candidate.candidateId];
              const llmAnalysis = scamCheck?.llm_analysis;

              return (
                <article
                  key={candidate.candidateId}
                  className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                        Rank #{index + 1}
                      </p>
                      <h2 className="mt-3 text-2xl font-bold text-white">{candidate.candidateName}</h2>
                      <p className="mt-2 text-slate-400">{candidate.candidateEmail}</p>
                      <p className="mt-4 text-sm text-slate-300">
                        Best company job: <span className="font-semibold text-white">{candidate.matchedJob?.title}</span>
                        {" "}at {candidate.matchedJob?.company}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Pipeline score</p>
                        <p className="mt-2 text-3xl font-black text-teal-300">{candidate.pipelineScore ?? 0}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Eligibility score</p>
                        <p className="mt-2 text-3xl font-black text-orange-300">
                          {formatPercentage(candidate.eligibilityScore)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {candidate.matchedSkills?.length ? (
                      candidate.matchedSkills.map((skill) => (
                        <span
                          key={`${candidate.candidateId}-${skill}`}
                          className="rounded-full border border-teal-300/20 bg-teal-400/10 px-4 py-2 text-sm text-teal-100"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
                        No explicit matched skills were extracted.
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => handleScamCheck(candidate.candidateId)}
                      disabled={checkingCandidateId === candidate.candidateId}
                      className="rounded-full bg-orange-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {checkingCandidateId === candidate.candidateId ? "Running scam check..." : "Scam Check"}
                    </button>
                  </div>

                  {scamCheck ? (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                      {"error" in scamCheck ? (
                        <p className="text-rose-200">{scamCheck.error}</p>
                      ) : (
                        <>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Scam risk</p>
                              <p className="mt-2 text-xl font-bold text-orange-200">
                                {llmAnalysis?.scam_risk_level || "Unavailable"}
                              </p>
                              <p className="mt-2 text-sm text-slate-300">
                                {llmAnalysis?.scam_reasoning || "No scam reasoning returned."}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">AI generation risk</p>
                              <p className="mt-2 text-xl font-bold text-cyan-200">
                                {llmAnalysis?.ai_generated_percentage ?? "N/A"}%
                              </p>
                              <p className="mt-2 text-sm text-slate-300">
                                {llmAnalysis?.ai_reasoning || "No AI-generation reasoning returned."}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            {(llmAnalysis?.scam_indicators || []).map((indicator) => (
                              <span
                                key={`${candidate.candidateId}-${indicator}`}
                                className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100"
                              >
                                {indicator}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6 text-slate-300">
              No eligible candidates were found for your company’s jobs yet.
            </section>
          )}
        </section>
      ) : (
        <>
          <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Resume Notifications
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  New jobs created from the live feed that match your previously uploaded resume appear here.
                </p>
              </div>
              <div className="rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm font-semibold text-orange-100">
                {notificationFeed.unreadCount || 0} unread
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              {notificationFeed.notifications.length ? (
                notificationFeed.notifications.slice(0, 5).map((notification) => (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => handleNotificationOpen(notification)}
                    className={`rounded-2xl border p-4 text-left transition hover:border-teal-300/30 hover:bg-white/[0.05] ${
                      notification.isRead
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-teal-300/20 bg-teal-400/10"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-base font-semibold text-white">
                          {notification.title} at {notification.company}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">{notification.message}</p>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-cyan-200">
                        Match {notification.matchScore ?? 0}%
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-slate-400">No job notifications yet for your uploaded resume.</p>
              )}
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                Search Keywords
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {candidateKeywords.length ? (
                  candidateKeywords.map((keyword) => (
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
                Resume Skills
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {resumeSkills.length ? (
                  resumeSkills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-orange-300/20 bg-orange-400/10 px-4 py-2 text-sm text-orange-100"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-slate-400">Upload a resume to extract candidate skills.</p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {candidateJobs.map((job) => (
              <JobCard key={`${job.company}-${job.title}`} {...job} />
            ))}
          </section>
        </>
      )}
    </main>
  );
}
