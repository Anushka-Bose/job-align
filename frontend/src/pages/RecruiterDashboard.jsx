import { useEffect, useMemo, useState } from "react";
import { FaFilter } from "react-icons/fa";
import { getRecruiterLeaderboard, runRecruiterScamCheck } from "../api/recruiter";

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || {};
  } catch {
    return {};
  }
};

const formatPercentage = (score) => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return "N/A";

  const normalized = numericScore <= 1 ? numericScore * 100 : numericScore;
  return `${Math.max(0, Math.min(100, Math.round(normalized)))}%`;
};

const formatFlag = (value) => (value ? "Available" : "Missing");
const hasScamSignals = (analysis) =>
  Number(analysis?.scam_percentage ?? 0) > 25 || (analysis?.scam_indicators || []).length > 0;
const getScamHeading = (analysis) => (hasScamSignals(analysis) ? "Scam Explanation" : "No Scam Signal Detected");
const getRiskHeading = (analysis) => (hasScamSignals(analysis) ? "Scam Risk" : "Fraud Check");

export default function RecruiterDashboard() {
  const user = useMemo(getCurrentUser, []);
  const token = localStorage.getItem("token");
  const [leaderboard, setLeaderboard] = useState([]);
  const [company, setCompany] = useState(user.company || "");
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [checkingCandidateId, setCheckingCandidateId] = useState("");
  const [scamChecks, setScamChecks] = useState({});

  useEffect(() => {
    let ignore = false;

    const loadLeaderboard = async () => {
      if (!token) {
        setError("Please login again to view the recruiter leaderboard.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await getRecruiterLeaderboard({ token });
        if (ignore) return;

        const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
        setLeaderboard(candidates);
        setCompany(data?.company || user.company || "");
        setTotalJobs(Number(data?.totalJobs) || 0);
        setSelectedCandidateId((current) => current || candidates[0]?.candidateId || "");
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Could not load recruiter leaderboard.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadLeaderboard();

    return () => {
      ignore = true;
    };
  }, [token, user.company]);

  const selectedCandidate = useMemo(
    () =>
      leaderboard.find((candidate) => candidate.candidateId === selectedCandidateId)
      || leaderboard[0]
      || null,
    [leaderboard, selectedCandidateId]
  );

  const averagePipelineScore = useMemo(() => {
    const scores = leaderboard
      .map((candidate) => Number(candidate.pipelineScore))
      .filter((score) => Number.isFinite(score));

    if (!scores.length) return "N/A";

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return formatPercentage(average);
  }, [leaderboard]);

  const topPipelineScore = useMemo(
    () =>
      leaderboard.reduce((highest, candidate) => {
        const current = Number(candidate.pipelineScore);
        return Number.isFinite(current) ? Math.max(highest, current) : highest;
      }, 0),
    [leaderboard]
  );

  const firstName = user.name?.trim().split(" ")[0] || "recruiter";

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

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-10 text-white lg:px-10 lg:py-14">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-slate-200">
          Loading recruiter leaderboard...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-white lg:px-10 lg:py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-teal-500/10 backdrop-blur">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">
              Recruiter Dashboard
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">
              Welcome {firstName} to Smart Align.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Review the live leaderboard returned by the backend for {company || "your company"}.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-teal-300">{leaderboard.length}</p>
              <p className="mt-2 text-sm text-slate-400">ranked candidates</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-orange-300">{averagePipelineScore}</p>
              <p className="mt-2 text-sm text-slate-400">average pipeline score</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
              <p className="text-3xl font-black text-cyan-300">{totalJobs}</p>
              <p className="mt-2 text-sm text-slate-400">company jobs scanned</p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-rose-100">
            {error}
          </p>
        ) : null}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-black/20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-300">
              Applicant Leaderboard
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white">Backend-ranked candidate list</h2>
          </div>

          <div className="mt-6 space-y-3">
            {leaderboard.map((candidate, index) => (
              <button
                key={candidate.candidateId}
                type="button"
                onClick={() => setSelectedCandidateId(candidate.candidateId)}
                className={`w-full rounded-[1.5rem] border p-4 text-left transition hover:border-teal-300/60 hover:bg-white/[0.06] ${
                  selectedCandidate?.candidateId === candidate.candidateId
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
                      <h3 className="text-lg font-bold text-white">{candidate.candidateName}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {candidate.matchedJob?.title || "Matched role"} | {candidate.matchedJob?.location || "Location unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-2xl font-black text-teal-300">
                      {formatPercentage(candidate.pipelineScore)}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Pipeline
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {leaderboard.length === 0 && !error ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 text-slate-300">
                No candidates are available in the leaderboard yet.
              </div>
            ) : null}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-teal-500/10">
          {selectedCandidate ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-teal-200">
                Profile Snapshot
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">{selectedCandidate.candidateName}</h2>
              <p className="mt-2 text-sm text-slate-400">{selectedCandidate.candidateEmail}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-400">Matched job</p>
                  <p className="mt-2 font-semibold text-white">
                    {selectedCandidate.matchedJob?.title || "Not available"}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-400">Eligibility score</p>
                  <p className="mt-2 font-semibold text-white">
                    {formatPercentage(selectedCandidate.eligibilityScore)}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-400">Top leaderboard score</p>
                  <p className="mt-2 font-semibold text-white">{formatPercentage(topPipelineScore)}</p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => handleScamCheck(selectedCandidate.candidateId)}
                  disabled={checkingCandidateId === selectedCandidate.candidateId}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-orange-300/40 bg-orange-300/10 px-5 py-3 font-semibold text-orange-100 transition hover:border-orange-200 hover:bg-orange-300/15 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FaFilter />
                  {checkingCandidateId === selectedCandidate.candidateId ? "Running scam check..." : "Scam Filtering"}
                </button>
              </div>

              {scamChecks[selectedCandidate.candidateId] ? (
                <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 p-5">
                  {"error" in scamChecks[selectedCandidate.candidateId] ? (
                    <p className="text-rose-200">{scamChecks[selectedCandidate.candidateId].error}</p>
                  ) : (
                    <>
                      {(() => {
                        const scamCheck = scamChecks[selectedCandidate.candidateId];
                        const llmAnalysis = scamCheck?.llm_analysis;

                        return (
                          <>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
                        Scam Analysis
                      </p>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-orange-300/20 bg-orange-400/10 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-orange-100/70">{getRiskHeading(llmAnalysis)}</p>
                          <p className="mt-2 text-2xl font-black text-orange-100">
                            {llmAnalysis?.scam_risk_level || "Unavailable"}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-orange-200">
                            {llmAnalysis?.scam_percentage ?? "N/A"}%
                          </p>
                        </div>
                        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">AI Writing Risk</p>
                          <p className="mt-2 text-2xl font-black text-cyan-100">
                            {llmAnalysis?.ai_risk_level || "Unavailable"}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-cyan-200">
                            {llmAnalysis?.ai_generated_percentage ?? "N/A"}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{getScamHeading(llmAnalysis)}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {llmAnalysis?.scam_reasoning || "No scam reasoning returned."}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">AI Explanation</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {llmAnalysis?.ai_reasoning || "No AI-generation reasoning returned."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Resume Facts</p>
                          <div className="mt-3 grid gap-2 text-sm text-slate-300">
                            <div className="flex items-center justify-between gap-3">
                              <span>Total words</span>
                              <span className="font-semibold text-white">
                                {scamCheck?.total_words ?? "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Email</span>
                              <span className="font-semibold text-white">
                                {formatFlag(scamCheck?.contact_info?.email)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Phone</span>
                              <span className="font-semibold text-white">
                                {formatFlag(scamCheck?.contact_info?.phone)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Links</span>
                              <span className="font-semibold text-white">
                                {formatFlag(scamCheck?.contact_info?.links)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Sections Found</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(scamCheck?.sections_found || []).length ? (
                              scamCheck.sections_found.map((section) => (
                                <span
                                  key={`${selectedCandidate.candidateId}-${section}`}
                                  className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-200"
                                >
                                  {section}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-200">
                                No standard sections detected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4">
                          <p className="text-sm uppercase tracking-[0.2em] text-rose-100/80">Scam Indicators</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(llmAnalysis?.scam_indicators || []).length ? (
                              llmAnalysis.scam_indicators.map((indicator) => (
                                <span
                                  key={`${selectedCandidate.candidateId}-${indicator}`}
                                  className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100"
                                >
                                  {indicator}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                                No scam indicators flagged
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4">
                          <p className="text-sm uppercase tracking-[0.2em] text-cyan-100/80">AI Indicators</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(llmAnalysis?.ai_indicators || []).length ? (
                              llmAnalysis.ai_indicators.map((indicator) => (
                                <span
                                  key={`${selectedCandidate.candidateId}-ai-${indicator}`}
                                  className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100"
                                >
                                  {indicator}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100">
                                No AI indicators flagged
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-slate-300">Select a candidate to view the profile snapshot.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
