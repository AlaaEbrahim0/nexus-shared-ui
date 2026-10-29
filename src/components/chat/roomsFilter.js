import { parseUtcDate } from "../../utils/utcToRelativeTime";

export const CHAT_ROOM_TABS = ["All", "Active", "Private", "Scheduled", "Patient-created"];

export const CHAT_ROOM_SORTS = ["Recent", "Soonest", "Members", "Name"];

const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

const timestamp = (value) => {
    const date = parseUtcDate(value);
    return date ? date.getTime() : null;
};

export const isRoomActive = (room, now = Date.now()) => {
    const last = timestamp(room?.lastMessageAtUtc);
    return last !== null && now - last <= ACTIVE_WINDOW_MS;
};

export const isRoomScheduled = (room, now = Date.now()) => {
    const start = timestamp(room?.scheduledStartAtUtc);
    return start !== null && start >= now;
};

/**
 * A room is patient-created when its owner row is not a doctor. The response
 * carries the owner's display snapshot, so a missing owner (legacy row) is
 * treated as unknown rather than as a patient room.
 */
export const isRoomPatientCreated = (room) =>
    room?.ownerDisplayName != null && room?.ownerIsDoctor === false;

const matchesTab = (room, tab, now) => {
    switch (tab) {
        case "Active":
            return isRoomActive(room, now);
        case "Private":
            return Boolean(room?.isPrivate);
        case "Scheduled":
            return isRoomScheduled(room, now);
        case "Patient-created":
            return isRoomPatientCreated(room);
        default:
            return true;
    }
};

const matchesQuery = (room, needle) => {
    if (!needle) return true;

    return (
        room?.name?.toLowerCase().includes(needle) ||
        room?.description?.toLowerCase().includes(needle) ||
        room?.ownerDisplayName?.toLowerCase().includes(needle)
    );
};

const compare = (a, b) => {
    const left = timestamp(a.lastMessageAtUtc);
    const right = timestamp(b.lastMessageAtUtc);

    if (left === right) return (a.name || "").localeCompare(b.name || "");
    if (left === null) return 1;
    if (right === null) return -1;

    return right - left;
};

const sortRooms = (rooms, sort) => {
    const sorted = [...rooms];

    switch (sort) {
        case "Soonest":
            return sorted.sort((a, b) => {
                const left = timestamp(a.scheduledStartAtUtc);
                const right = timestamp(b.scheduledStartAtUtc);
                if (left === right) return compare(a, b);
                if (left === null) return 1;
                if (right === null) return -1;
                return left - right;
            });
        case "Members":
            return sorted.sort((a, b) =>
                (b.memberCount || 0) - (a.memberCount || 0) || compare(a, b));
        case "Name":
            return sorted.sort((a, b) =>
                (a.name || "").localeCompare(b.name || "") || compare(a, b));
        default:
            return sorted.sort(compare);
    }
};

/**
 * Search, category and sort over the already-loaded room page.
 *
 * `now` is injectable so the Active/Scheduled tabs are deterministic in tests.
 */
export function filterRooms(rooms, { query = "", tab = "All", sort = "Recent" } = {}, now = Date.now()) {
    const needle = String(query || "").trim().toLowerCase();
    const filtered = (rooms || []).filter(
        (room) => matchesTab(room, tab, now) && matchesQuery(room, needle)
    );

    return sortRooms(filtered, sort);
}
