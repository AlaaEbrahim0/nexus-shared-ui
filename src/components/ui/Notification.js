import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authProvider";
import { useNotifications } from "../../context/notificationsContext";
import {
    FiActivity,
    FiCalendar,
    FiFileText,
    FiHeart,
    FiMessageCircle,
    FiMessageSquare,
} from "react-icons/fi";
import { convertUtcToRelativeTime } from "../../utils/utcToRelativeTime";

const notificationKind = (type = "", resources = {}) => {
    const normalizedType = type.toLowerCase();
    if (resources.roomId || normalizedType.includes("roommessage")) {
        return { label: "Room activity", Icon: FiMessageSquare };
    }
    if (resources.followUpId || resources.noteId || normalizedType.includes("followup") || normalizedType.includes("patientnote")) {
        return { label: "Care update", Icon: FiFileText };
    }
    if (normalizedType.includes("postlike")) {
        return { label: "Post activity", Icon: FiHeart };
    }
    if (resources.appointmentId || normalizedType.includes("appointment")) {
        return { label: "Appointment reminder", Icon: FiCalendar };
    }
    if (resources.postId || normalizedType.includes("comment")) {
        return { label: "Community update", Icon: FiMessageCircle };
    }
    return { label: "System alert", Icon: FiActivity };
};

const isDoctorRole = (roles = []) =>
    (roles || []).some(
        (role) =>
            typeof role === "string" &&
            ["doctor", "admin"].includes(role.toLowerCase())
    );

export const Notification = ({
    id,
    title,
    message,
    notifierUserName,
    dateCreated,
    relatedResourceId,
    relatedCount = 1,
    resources = {},
    type,
    isRead,
}) => {
    const notificationResources = resources || {};
    const { markAsRead } = useNotifications();
    const { roles } = useAuth();
    const navigate = useNavigate();
    const { label, Icon } = notificationKind(type, notificationResources);
    const doctorPortal = isDoctorRole(roles);

    const handleOpen = async () => {
        // Marking the notification read does not touch the room's message read
        // position; that remains the chat read endpoint's responsibility.
        if (!isRead) await markAsRead(id);

        const roomId = notificationResources.roomId ?? relatedResourceId;
        if (notificationResources.roomId) {
            navigate(
                doctorPortal
                    ? `/Community/rooms/${notificationResources.roomId}`
                    : `/community/rooms/${notificationResources.roomId}`
            );
        } else if (notificationResources.followUpId || notificationResources.noteId) {
            navigate(doctorPortal ? "/workspace" : "/history");
        } else if (notificationResources.postId) {
            navigate(`/forums/${notificationResources.postId}${notificationResources.commentId ? `#comment-${notificationResources.commentId}` : ""}`);
        } else if (notificationResources.appointmentId) {
            navigate("/appointments");
        } else if (
            String(type || "").toLowerCase().includes("roommessage") &&
            roomId != null
        ) {
            navigate(doctorPortal ? `/Community/rooms/${roomId}` : `/community/rooms/${roomId}`);
        }
    };

    const count = Math.max(1, Number(relatedCount) || 1);

    return (
        <button
            type="button"
            onClick={handleOpen}
            className={`mb-1 flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${isRead ? "bg-base-100 hover:bg-neutral-50" : "bg-primary-50 hover:bg-primary-100"}`}
            aria-label={`${isRead ? "Read" : "Unread"}: ${label}. ${message}`}
        >
            <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${isRead ? "bg-neutral-100 text-neutral-700" : "bg-primary-100 text-primary-800"}`}>
                <Icon aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-neutral-600">{label}</span>
                        {count > 1 && (
                            <span className="shrink-0 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-900" aria-label={`${count} events`}>
                                {count}
                            </span>
                        )}
                    </span>
                    {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-700" aria-label="Unread" />}
                </span>
                <span className="mt-1 block text-sm font-medium leading-5 text-neutral-900">{title || message}</span>
                {title && message && (
                    <span className="mt-0.5 block text-xs leading-5 text-neutral-600">{message}</span>
                )}
                <span className="mt-1 block text-xs text-neutral-600">{notifierUserName ? `${notifierUserName} · ` : ""}{convertUtcToRelativeTime(dateCreated)}</span>
            </span>
        </button>
    );
};
