import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "../auth/authProvider";
import { getToken } from "../auth/session";
import { API_BASE_URL } from "../api/client";
import toast from "react-hot-toast";
import {
    getUserNotifications,
    getUnreadCount,
    markAllNotificationsRead,
    markNotificationRead,
} from "../api/notifications.api";

const NotificationsContext = createContext();

const MAX_START_RETRIES = 5;

export const NotificationsProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth();
    // Tracks which notification ids have already been shown in this session.
    // Aggregated room notifications reuse their row id, so an update must
    // replace the row silently instead of appearing as a new toast per message.
    const knownIdsRef = useRef(new Set());

    const fetchUnreadCount = useCallback(async () => {
        if (!token) {
            setCount(0);
            return 0;
        }

        try {
            const serverCount = await getUnreadCount();
            const normalised = Math.max(0, Number(serverCount) || 0);
            setCount(normalised);
            return normalised;
        } catch {
            // The badge keeps its last known value; the next successful
            // notification fetch or reconnect will resynchronise it.
            return null;
        }
    }, [token]);

    const fetchNotifications = useCallback(
        async (pageNumber = 1, pageSize = 20) => {
            if (!token) {
                setNotifications([]);
                setCount(0);
                setError(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await getUserNotifications(pageNumber, pageSize);
                const list = Array.isArray(data) ? data : [];
                knownIdsRef.current = new Set(
                    list.map((entry) => entry.id).filter((id) => id != null)
                );
                setNotifications(list);

                const serverCount = await fetchUnreadCount();
                if (serverCount === null) {
                    setCount(list.filter((entry) => !entry.isRead).length);
                }
                setLoading(false);
            } catch (requestError) {
                setError(requestError);
                setLoading(false);
            }
        },
        [token, fetchUnreadCount]
    );

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (!token) {
            knownIdsRef.current = new Set();
            setNotifications([]);
            setCount(0);
            setError(null);
            setLoading(false);
        }
    }, [token]);

    const markAllAsRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((previous) =>
                previous.map((notification) => ({
                    ...notification,
                    isRead: true,
                }))
            );
            setCount(0);
            await fetchUnreadCount();
        } catch {
            // Leave the badge untouched so a failed write is visible as
            // still-unread rather than silently disappearing.
        }
    };

    const markAsRead = async (id) => {
        try {
            const wasUnread = notifications.some(
                (notification) =>
                    notification.id === id && !notification.isRead
            );
            setNotifications((previous) =>
                previous.map((notification) =>
                    notification.id === id
                        ? { ...notification, isRead: true }
                        : notification
                )
            );
            if (wasUnread) setCount((previous) => Math.max(0, previous - 1));
            await markNotificationRead(id);
            await fetchUnreadCount();
        } catch {
            // A failed mark-read is retried by the next fetch; do not adjust
            // the server-derived badge locally in the meantime.
            await fetchUnreadCount();
        }
    };

    useEffect(() => {
        if (!token) return undefined;

        let cancelled = false;
        let retryTimer = null;
        let retryCount = 0;
        let startTask = null;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/notification-hub`, {
                accessTokenFactory: () => getToken() || token,
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        const addNotification = (notification) => {
            if (cancelled || notification == null) return;

            const isNew =
                notification.id != null &&
                !knownIdsRef.current.has(notification.id);
            if (notification.id != null) {
                knownIdsRef.current.add(notification.id);
            }

            setNotifications((previous) => {
                if (
                    notification.id != null &&
                    previous.some((entry) => entry.id === notification.id)
                ) {
                    // Aggregated room notifications (and any future server-side
                    // edits) replace the existing row in place.
                    return previous.map((entry) =>
                        entry.id === notification.id ? notification : entry
                    );
                }
                return [notification, ...previous];
            });

            // Ask the server rather than guessing: an aggregated update can
            // flip a previously read row back to unread.
            fetchUnreadCount();
            if (isNew) toast.success("Notification received");
        };

        const updateNotification = (notification) => {
            if (cancelled || notification?.id == null) return;

            knownIdsRef.current.add(notification.id);
            setNotifications((previous) =>
                previous.map((entry) =>
                    entry.id === notification.id ? notification : entry
                )
            );
            fetchUnreadCount();
        };

        const handleMessage = () => undefined;

        connection.on("ReceiveNotification", addNotification);
        connection.on("NotificationUpdated", updateNotification);
        connection.on("ReceiveMessage", handleMessage);

        connection.onreconnecting(() => undefined);

        connection.onreconnected(() => {
            if (cancelled) return;
            retryCount = 0;
            fetchNotifications();
        });

        const scheduleRestart = () => {
            if (cancelled || retryCount >= MAX_START_RETRIES) return;
            const delay = Math.min(30000, 2000 * (retryCount + 1));
            retryCount += 1;
            retryTimer = window.setTimeout(() => {
                retryTimer = null;
                start();
            }, delay);
        };

        connection.onclose(() => {
            if (cancelled) return;
            scheduleRestart();
        });

        const isUnauthorised = (startError) =>
            startError?.statusCode === 401 ||
            startError?.status === 401 ||
            /401|unauthor/i.test(String(startError?.message || ""));

        function start() {
            if (cancelled || retryTimer) return;
            if (connection.state !== signalR.HubConnectionState.Disconnected) {
                return;
            }

            startTask = connection.start();
            startTask
                .then(() => {
                    retryCount = 0;
                    if (cancelled) {
                        connection.stop().catch(() => undefined);
                        return;
                    }
                    // A reconnect can miss notifications while the socket was
                    // down; SQL Server remains the source of truth.
                    fetchNotifications();
                })
                .catch((startError) => {
                    if (cancelled) return;
                    if (isUnauthorised(startError)) {
                        window.dispatchEvent(new Event("auth:expired"));
                        return;
                    }
                    scheduleRestart();
                });
        }

        start();

        return () => {
            cancelled = true;
            if (retryTimer) window.clearTimeout(retryTimer);
            connection.off("ReceiveNotification", addNotification);
            connection.off("NotificationUpdated", updateNotification);
            connection.off("ReceiveMessage", handleMessage);

            const stopWhenSettled = () => {
                if (connection.state === signalR.HubConnectionState.Disconnected) {
                    return;
                }
                connection.stop().catch(() => undefined);
            };

            // Stopping while start() is still resolving used to throw
            // "Failed to start the HttpConnection before stop() was called".
            // Wait for the in-flight start, then stop.
            if (startTask) {
                startTask.catch(() => undefined).finally(stopWhenSettled);
            } else {
                stopWhenSettled();
            }
        };
    }, [token, fetchNotifications, fetchUnreadCount]);

    return (
        <NotificationsContext.Provider
            value={{
                notifications,
                loading,
                error,
                fetchNotifications,
                setNotifications,
                markAllAsRead,
                markAsRead,
                count,
            }}
        >
            {children}
        </NotificationsContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationsContext);
