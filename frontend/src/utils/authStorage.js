const parseJson = (value) => {
  try {
    return JSON.parse(value || "null");
  } catch {
    return null;
  }
};

const decodeBase64Url = (value = "") => {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  try {
    return atob(`${normalized}${padding}`);
  } catch {
    return "";
  }
};

export const getTokenPayload = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  return parseJson(decodeBase64Url(payload));
};

export const getStoredUser = () => {
  const user = parseJson(localStorage.getItem("user"));
  const tokenPayload = getTokenPayload();

  if (!user && !tokenPayload) {
    return null;
  }

  return {
    ...(user || {}),
    id: tokenPayload?.id || user?.id || null,
    role: tokenPayload?.role || user?.role || null,
  };
};
