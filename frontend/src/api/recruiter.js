import { apiRequest } from "./client";

export const getRecruiterLeaderboard = ({ token }) =>
  apiRequest("/api/recruiter/candidates/leaderboard", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const runRecruiterScamCheck = ({ candidateId, token }) =>
  apiRequest(`/api/recruiter/candidates/${candidateId}/scam-check`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
