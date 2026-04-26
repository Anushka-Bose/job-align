import { apiRequest } from "./client";

export const signup = (form) =>
  apiRequest("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(form)
  });

export const login = (credentials) =>
  apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  });
