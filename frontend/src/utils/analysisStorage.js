const ANALYSIS_STORAGE_KEY = "latestJobAnalysis";

const toCompactJob = (job = {}) => ({
  id: job.id ?? job._id ?? null,
  jobId: job.jobId ?? null,
  title: job.title ?? null,
  company: job.company ?? null,
  location: job.location ?? null,
  type: job.type ?? null,
  score: job.score ?? job.similarity_score ?? job.adjusted_similarity_score ?? job.matchScore ?? null,
  similarity_score: job.similarity_score ?? null,
  adjusted_similarity_score: job.adjusted_similarity_score ?? null,
  matchScore: job.matchScore ?? null,
  redirectUrl: job.redirectUrl ?? job.redirect_url ?? null,
  redirect_url: job.redirect_url ?? job.redirectUrl ?? null,
  searchQuery: job.searchQuery ?? job.search_query ?? null,
  search_query: job.search_query ?? job.searchQuery ?? null,
});

const compactAnalysis = (analysis = {}) => ({
  resume_score: analysis.resume_score ?? null,
  competencies: analysis.competencies ?? {},
  competency_gap: Array.isArray(analysis.competency_gap) ? analysis.competency_gap : [],
  match_summary: analysis.match_summary ?? null,
  highlights: Array.isArray(analysis.highlights)
    ? analysis.highlights.map((item) => ({
      text: item?.text ?? "",
      suggestion: item?.suggestion ?? "",
      score: item?.score ?? null,
      color: item?.color ?? null,
      label: item?.label ?? null,
      type: item?.type ?? "general",
    }))
    : [],
  top_jobs: Array.isArray(analysis.top_jobs) ? analysis.top_jobs.slice(0, 10).map(toCompactJob) : [],
  search_keywords: Array.isArray(analysis.search_keywords) ? analysis.search_keywords : [],
  resume_skills: Array.isArray(analysis.resume_skills) ? analysis.resume_skills : [],
  job_count: analysis.job_count ?? null,
});

export const readLatestAnalysis = () => {
  try {
    const fromSession = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (fromSession) {
      return JSON.parse(fromSession);
    }

    const fromLocal = localStorage.getItem(ANALYSIS_STORAGE_KEY);
    return fromLocal ? JSON.parse(fromLocal) : null;
  } catch {
    return null;
  }
};

export const writeLatestAnalysis = (analysis) => {
  if (!analysis) {
    return false;
  }

  const attempts = [
    analysis,
    compactAnalysis(analysis),
  ];

  for (const attempt of attempts) {
    try {
      const serialized = JSON.stringify(attempt);
      localStorage.setItem(ANALYSIS_STORAGE_KEY, serialized);
      sessionStorage.setItem(ANALYSIS_STORAGE_KEY, serialized);
      return true;
    } catch {
      // Retry with a smaller payload, but never block the UI flow.
    }
  }

  return false;
};
