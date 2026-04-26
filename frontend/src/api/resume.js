import { apiRequest } from "./client";

export const uploadResume = ({ file, token }) => {
  const formData = new FormData();
  formData.append("resume", file);

  return apiRequest("/api/resume/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
};
