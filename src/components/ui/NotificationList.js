// src/components/NotificationsList.js
import React from "react";
import { Notification } from "../ui/Notification";
import { useNotifications } from "../../context/notificationsContext";

export const NotificationsList = ({ notifications }) => {
    const { loading, markAsRead, markAllAsRead } = useNotifications();

    return (
        <>
            <div className="flex flex-row justify-between p-4 border-b-2 ">
                <h1 className="text-xl text-left font-bold ">Notifications</h1>
                <button onClick={markAllAsRead} className="text-sm font-semibold text-primary-800">
                    Mark All As Read
                </button>
            </div>

            {loading && (
                <div className="text-center">
                    <span className="loading loading-spinner"></span>
                </div>
            )}

            {!loading && !notifications.length && (
                <div className="text-center text-neutral-700 text-lg">
                    No notifications yet
                </div>
            )}

            <ul
                tabIndex={0}
                className="mt-1 overflow-y-auto max-h-96 divide-y-2"
            >
                {notifications.map((notification) => (
                    <li key={notification.id}>
                        <Notification {...notification} />
                    </li>
                ))}
            </ul>
        </>
    );
};
