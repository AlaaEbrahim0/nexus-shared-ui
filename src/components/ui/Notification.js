import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/notificationsContext";
import { FiActivity, FiCalendar, FiMessageCircle } from "react-icons/fi";
import { convertUtcToRelativeTime } from "../../utils/utcToRelativeTime";

const notificationKind = (type = "", resources = {}) => {
    const normalizedType = type.toLowerCase();
    if (resources.appointmentId || normalizedType.includes("appointment")) {
        return { label: "Appointment reminder", Icon: FiCalendar };
    }
    if (resources.postId || normalizedType.includes("comment")) {
        return { label: "Community update", Icon: FiMessageCircle };
    }
    return { label: "System alert", Icon: FiActivity };
};

export const Notification = ({
    id,
    title,
    message,
    notifierUserName,
    dateCreated,
    resources = {},
    type,
    isRead,
}) => {
    const notificationResources = resources || {};
    const { markAsRead } = useNotifications();
    const navigate = useNavigate();
    const { label, Icon } = notificationKind(type, notificationResources);

    const handleOpen = async () => {
        if (!isRead) await markAsRead(id);
        if (notificationResources.postId) {
            navigate(`/forums/${notificationResources.postId}${notificationResources.commentId ? `#comment-${notificationResources.commentId}` : ""}`);
        } else if (notificationResources.appointmentId) {
            navigate("/appointments");
        }
    };

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
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">{label}</span>
                    {!isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-700" aria-label="Unread" />}
                </span>
                <span className="mt-1 block text-sm font-medium leading-5 text-neutral-900">{title || message}</span>
                <span className="mt-1 block text-xs text-neutral-600">{notifierUserName ? `${notifierUserName} · ` : ""}{convertUtcToRelativeTime(dateCreated)}</span>
            </span>
        </button>
    );
};
