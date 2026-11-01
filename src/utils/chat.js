export const CHAT_REPORT_STATUSES = [
    "Open",
    "Reviewed",
    "Dismissed",
    "Actioned",
];

export const CHAT_REPORT_FILTERS = [...CHAT_REPORT_STATUSES, "All"];

export const isRoomOwner = (room) => room?.myRole === "Owner";

export const canModerateRoom = (room) =>
    Boolean(
        room?.isMember &&
            (room.myRole === "Owner" || room.myRole === "Moderator")
    );

export const isOwnChatMessage = (message, room) =>
    Boolean(
        message &&
            room?.myMemberId &&
            message.senderMemberId === room.myMemberId
    );

export const canDeleteChatMessage = (message, room) => {
    if (!room?.isMember || !message || message.isDeleted) return false;

    return isOwnChatMessage(message, room) || canModerateRoom(room);
};

export const canReportChatMessage = (message, room) =>
    Boolean(
        room?.isMember &&
            message &&
            !message.isDeleted &&
            !isOwnChatMessage(message, room)
    );

export const canManageChatMemberRole = (room, member) =>
    Boolean(
        room?.isMember &&
            isRoomOwner(room) &&
            member &&
            member.role !== "Owner" &&
            member.isDoctor
    );

export const getChatMemberInitial = (displayName) => {
    const trimmed = String(displayName || "").trim();
    return trimmed ? trimmed[0].toUpperCase() : "?";
};

export const createClientMessageId = () => {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.getRandomValues === "function"
    ) {
        crypto.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }

    // RFC 4122 version 4 layout.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
        12,
        16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Merge server messages and local optimistic messages without duplicates.
 *
 * Server ids are authoritative. An optimistic message is removed as soon as a
 * confirmed message with the same clientMessageId arrives, whether that
 * confirmation came from the REST response or the SignalR event.
 */
export const mergeChatMessages = (existing = [], incoming = []) => {
    const confirmed = new Map();
    const optimistic = new Map();

    const isConfirmed = (clientMessageId) =>
        Array.from(confirmed.values()).some(
            (message) => message.clientMessageId === clientMessageId
        );

    const add = (message) => {
        if (!message) return;

        if (message.id > 0) {
            confirmed.set(message.id, message);
            if (message.clientMessageId) {
                optimistic.delete(message.clientMessageId);
            }
            return;
        }

        if (
            message.clientMessageId &&
            !isConfirmed(message.clientMessageId)
        ) {
            optimistic.set(message.clientMessageId, message);
        }
    };

    existing.forEach(add);
    incoming.forEach(add);

    return [...confirmed.values(), ...optimistic.values()].sort(
        (left, right) => {
            if (left.id > 0 && right.id > 0) return left.id - right.id;
            if (left.id > 0) return -1;
            if (right.id > 0) return 1;

            return (
                new Date(left.sentAtUtc).getTime() -
                new Date(right.sentAtUtc).getTime()
            );
        }
    );
};

export const upsertChatMember = (members = [], member) => {
    if (!member) return members;

    const byId = new Map(members.map((item) => [item.memberId, item]));
    byId.set(member.memberId, member);

    return Array.from(byId.values()).sort(
        (left, right) => left.memberId - right.memberId
    );
};

export const removeChatMember = (members = [], memberId) =>
    members.filter((member) => member.memberId !== memberId);

/**
 * Merge a member event into the current room when the event is about the
 * current user. A role change made in another session (for example, the owner
 * promotes this doctor to Moderator) must update the room-level permissions,
 * not only the member list. Otherwise the moderation UI stays hidden until a
 * full page reload.
 */
export const mergeRoomMemberEvent = (room, member) => {
    if (!room || !member || room.myMemberId == null) return room;
    if (member.memberId !== room.myMemberId) return room;

    return {
        ...room,
        isMember: true,
        myRole: member.role ?? room.myRole,
    };
};

/**
 * Apply the current user's own MemberLeft event immediately.
 *
 * The server normally removes a leaver's connections before broadcasting, so
 * this is a defensive fallback for a client that still receives the event.
 * Clearing the preview is important because it is conversation content.
 */
export const markRoomMemberLeft = (room, memberId) => {
    if (!room || room.myMemberId == null || room.myMemberId !== memberId) {
        return room;
    }

    return {
        ...room,
        isMember: false,
        myRole: null,
        lastMessagePreview: null,
    };
};

/**
 * RoomArchived is broadcast to every member, but the snapshot is built from
 * the archiving owner's membership. Only merge shared room fields; never copy
 * myRole, myMemberId, isMember, or lastMessagePreview from that event.
 */
export const mergeRoomArchiveEvent = (room, event) => {
    if (!room || !event) return room;

    return {
        ...room,
        name: event.name ?? room.name,
        description: event.description ?? room.description,
        visibility: event.visibility ?? room.visibility,
        isArchived: event.isArchived ?? true,
        memberCount: event.memberCount ?? room.memberCount,
        lastMessageAtUtc: event.lastMessageAtUtc ?? room.lastMessageAtUtc,
    };
};

/**
 * RoomUpdated follows a lock, unlock, privacy, schedule or cover change. The
 * payload is one snapshot built for the moderator who made the change, so it
 * must not overwrite what is specific to the viewer: membership, role, the
 * member id the composer uses, or the message preview of a room the viewer
 * may not read. Description is never copied either: the redaction rule
 * depends on who is asking, and a member-facing broadcast is not a safe
 * source for it.
 */
export const mergeRoomUpdateEvent = (room, event) => {
    if (!room || !event) return room;

    return {
        ...room,
        name: event.name ?? room.name,
        visibility: event.visibility ?? room.visibility,
        isPrivate: event.isPrivate ?? room.isPrivate,
        requiresPassword: event.requiresPassword ?? room.requiresPassword,
        isLocked: event.isLocked ?? room.isLocked,
        isArchived: event.isArchived ?? room.isArchived,
        coverImageUrl: event.coverImageUrl !== undefined ? event.coverImageUrl : room.coverImageUrl,
        scheduledStartAtUtc: event.scheduledStartAtUtc !== undefined
            ? event.scheduledStartAtUtc
            : room.scheduledStartAtUtc,
        memberCount: event.memberCount ?? room.memberCount,
        ownerDisplayName: event.ownerDisplayName ?? room.ownerDisplayName,
        ownerIsDoctor: event.ownerIsDoctor ?? room.ownerIsDoctor,
    };
};

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
});

const toValidDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const formatChatTimestamp = (value) => {
    const date = toValidDate(value);
    return date ? timestampFormatter.format(date) : "";
};

export const formatChatDay = (value) => {
    const date = toValidDate(value);
    return date ? dayFormatter.format(date) : "";
};

export const chatDayKey = (value) => {
    const date = toValidDate(value);
    if (!date) return "";

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};
