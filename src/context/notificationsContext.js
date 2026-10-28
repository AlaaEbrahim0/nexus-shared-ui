// src/context/notificationsContext.js
import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "../auth/authProvider";
import { getToken } from "../auth/session";
import { API_BASE_URL } from "../api/client";
import toast from "react-hot-toast";
import { getUserNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications.api";

const url = API_BASE_URL;
const NotificationsContext = createContext();

export const NotificationsProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth();
    const [connection, setConnection] = useState(null);

    const fetchNotifications = useCallback(async (pageNumber = 1, pageSize = 20) => {
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
            const notificationsData = await getUserNotifications(pageNumber, pageSize);
            setNotifications(notificationsData);
            setCount(notificationsData.filter((x) => !x.isRead).length);
            setLoading(false);
        } catch (err) {
            console.log(err);
            setError(err);
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (!token) {
            setNotifications([]);
            setCount(0);
            setError(null);
            setLoading(false);
        }
    }, [token]);

    const markAllAsRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications((prevNotifications) =>
                prevNotifications.map((notification) => ({
                    ...notification,
                    isRead: true,
                }))
            );
            setCount(0);
        } catch (err) {
            console.log(err);
        }
    };

    const markAsRead = async (id) => {
        try {
            setNotifications((prevNotifications) =>
                prevNotifications.map((notification) =>
                    notification.id === id
                        ? { ...notification, isRead: true }
                        : notification
                )
            );
            await markNotificationRead(id);
            setCount((prev) => prev - 1);
        } catch (err) {
            console.log(err);
        }
    };

    const handleNewNotification = (notification) => {
        setNotifications((prevNotifications) => [
            notification,
            ...prevNotifications,
        ]);
        setCount((prevCount) => prevCount + 1);
    };

    useEffect(() => {
        if (!token) {
            setConnection(null);
            return undefined;
        }

        // Read the token from the persisted session: SignalR reconnects on its
        // own and the token factory may be called long after the React state
        // that created the connection was unmounted.
        const accessTokenFactory = () => getToken() || token;

        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${url}/notification-hub`, {
                accessTokenFactory,
            })
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);

        return () => {
            if (newConnection) {
                newConnection.stop();
            }
        };
    }, [token]);

    useEffect(() => {
        const startConnection = async () => {
            if (
                connection &&
                connection.state === signalR.HubConnectionState.Disconnected
            ) {
                try {
                    await connection.start();
                    console.log("Connected to SignalR hub");

                    connection.on("ReceiveNotification", (notification) => {
                        console.log("Notification received:", notification);
                        handleNewNotification(notification);
                        toast.success("Notification received");
                    });

                    connection.on("ReceiveMessage", (message) => {
                        console.log("Message received:", message);
                    });
                } catch (err) {
                    console.error("Error connecting to SignalR hub:", err);
                    // Implement retry logic if needed
                }
            }
        };

        if (connection) {
            startConnection();

            return () => {
                connection.off("ReceiveNotification");
                connection.off("ReceiveMessage");
                connection.stop();
            };
        }
    }, [connection]);

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
