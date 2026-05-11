const ANALYSIS_STORAGE_KEY = "latestJobAnalysis";

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
    return;
  }

  const serialized = JSON.stringify(analysis);
  localStorage.setItem(ANALYSIS_STORAGE_KEY, serialized);
  sessionStorage.setItem(ANALYSIS_STORAGE_KEY, serialized);
};
