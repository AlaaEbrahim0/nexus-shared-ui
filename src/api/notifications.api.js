import apiClient from "./client";

export const getUserNotifications = async (pageNumber = 1, pageSize = 20) => {
    const { data } = await apiClient.get("/api/notifications/users/me", { params: { pageNumber, pageSize } });
    return data;
};

export const getUnreadCount = async () => {
    const { data } = await apiClient.get("/api/notifications/unread-count");
    return data.count;
};

export const markAllNotificationsRead = async () => {
    const { data } = await apiClient.put("/api/notifications/users/me/read");
    return data;
};

export const markNotificationRead = async (id) => {
    const { data } = await apiClient.put(`/api/notifications/${id}/read`);
    return data;
};

export const markMultipleNotificationsRead = async (ids) => {
    const { data } = await apiClient.put("/api/notifications/read-many", ids);
    return data;
};
