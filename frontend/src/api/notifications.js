import { apiRequest } from "./client";

export const getNotifications = ({ token }) =>
  apiRequest("/api/notifications", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const markNotificationRead = ({ token, notificationId }) =>
  apiRequest(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
