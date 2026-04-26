const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const buildUrl = (path) => {
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }

  return `${API_BASE_URL}${path}`;
};

const resolveErrorMessage = (payload) => {
  if (!payload) return "Request failed";
  if (typeof payload === "string") return payload;
  return payload.message || payload.msg || payload.error || "Request failed";
};

export const apiRequest = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const hasFormDataBody = options.body instanceof FormData;

  if (!hasFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload));
  }

  return payload;
};
