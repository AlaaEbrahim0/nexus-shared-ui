import { Link } from "react-router-dom";
import { FiClock, FiLock, FiMessageCircle, FiPauseCircle, FiUsers } from "react-icons/fi";
import { Badge, Button, Card } from "../ui/primitives";
import { safeHttpUrl } from "../profile/profileUtils";
import { convertUtcToRelativeTime } from "../../utils/utcToRelativeTime";

const memberLabel = (count) => {
    const value = Number.isFinite(count) ? count : 0;
    return `${value} ${value === 1 ? "member" : "members"}`;
};

/**
 * One room in the directory grid.
 *
 * The title link is stretched over the whole card so a click anywhere opens the
 * room, and the Join button is lifted above it. The cover is decorative (the
 * title carries the name), and only absolute http(s) URLs are rendered.
 */
export const RoomCard = ({ room, to, onJoin, joinDisabled = false, className = "" }) => {
    if (!room) return null;

    const coverUrl = safeHttpUrl(room.coverImageUrl);
    const isArchived = Boolean(room.isArchived);
    const isLocked = Boolean(room.isLocked);
    const cannotJoin = joinDisabled || isArchived || isLocked;
    const lastActivity = room.lastMessageAtUtc
        ? convertUtcToRelativeTime(room.lastMessageAtUtc)
        : "";
    const scheduled = room.scheduledStartAtUtc
        ? convertUtcToRelativeTime(room.scheduledStartAtUtc)
        : "";

    const joinLabel = isArchived ? "Archived" : isLocked ? "Paused" : "Join";
    const joinTitle = isArchived
        ? "This room has been archived."
        : isLocked
            ? "This room is paused and is not accepting new members."
            : undefined;

    const title = to ? (
        <Link
            to={to}
            className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 after:content-['']"
        >
            {room.name}
        </Link>
    ) : (
        room.name
    );

    return (
        <Card
            as="article"
            padded={false}
            hover
            className={`relative flex flex-col overflow-hidden ${className}`}
        >
            <div className="relative h-36 w-full overflow-hidden bg-neutral-100">
                {coverUrl ? (
                    <img
                        src={coverUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div
                        aria-hidden="true"
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-50 via-neutral-50 to-neutral-100"
                    >
                        <FiMessageCircle className="h-8 w-8 text-primary-300" />
                    </div>
                )}

                <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                    <Badge variant={room.ownerIsDoctor ? "primary" : "success"} size="sm">
                        {room.ownerIsDoctor ? "Doctor" : "Patient"} host
                    </Badge>
                    {room.isPrivate && (
                        <Badge variant="neutral" size="sm">
                            <FiLock aria-hidden="true" />
                            {room.requiresPassword ? "Password" : "Private"}
                        </Badge>
                    )}
                </div>

                {isArchived && (
                    <span className="absolute right-3 top-3">
                        <Badge variant="warning" size="sm">Archived</Badge>
                    </span>
                )}
                {!isArchived && isLocked && (
                    <span className="absolute right-3 top-3">
                        <Badge variant="warning" size="sm">
                            <FiPauseCircle aria-hidden="true" />
                            Paused
                        </Badge>
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 text-base font-bold text-neutral-900">
                        {title}
                    </h3>
                    {room.isMember && Number(room.unreadCount) > 0 && (
                        <span
                            className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-xs font-bold leading-5 text-white"
                            aria-label={`${room.unreadCount} unread ${room.unreadCount === 1 ? "message" : "messages"}`}
                        >
                            {room.unreadCount > 99 ? "99+" : room.unreadCount}
                        </span>
                    )}
                </div>

                <p className="line-clamp-2 text-sm text-neutral-600">
                    {room.description || "No description yet."}
                </p>

                <div className="mt-auto flex items-end justify-between gap-3 pt-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                        <span className="inline-flex items-center gap-1">
                            <FiUsers aria-hidden="true" />
                            {memberLabel(room.memberCount)}
                        </span>
                        {scheduled && (
                            <span className="inline-flex items-center gap-1">
                                <FiClock aria-hidden="true" />
                                Starts {scheduled}
                            </span>
                        )}
                        {!scheduled && lastActivity && (
                            <span className="inline-flex items-center gap-1">
                                <FiMessageCircle aria-hidden="true" />
                                Active {lastActivity}
                            </span>
                        )}
                    </div>

                    {room.isMember ? (
                        <Link
                            to={to || "#"}
                            className="relative z-10 inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-neutral-300 bg-base-100 px-3 text-sm font-semibold text-neutral-800 transition hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        >
                            Open
                        </Link>
                    ) : (
                        <Button
                            size="sm"
                            className="relative z-10 shrink-0"
                            disabled={cannotJoin}
                            title={joinTitle}
                            onClick={() => onJoin?.(room)}
                        >
                            {joinLabel}
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
};
