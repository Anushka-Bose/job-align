import { apiRequest } from "./client";

export const getCandidateJobFeed = ({ userId, token }) =>
  apiRequest(`/feed/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
