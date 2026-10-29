import {
    CHAT_ROOM_SORTS,
    CHAT_ROOM_TABS,
    filterRooms,
    isRoomActive,
    isRoomPatientCreated,
    isRoomScheduled,
} from "./roomsFilter";

const now = Date.parse("2026-10-29T12:00:00Z");

const room = (overrides = {}) => ({
    id: 1,
    name: "Room",
    description: "",
    lastMessageAtUtc: null,
    scheduledStartAtUtc: null,
    memberCount: 0,
    isPrivate: false,
    ownerDisplayName: "Dana Doctor",
    ownerIsDoctor: true,
    ...overrides,
});

const names = (rooms) => rooms.map((entry) => entry.name);

describe("chat room tabs and sorts", () => {
    it("exposes the documented tab and sort vocabulary", () => {
        expect(CHAT_ROOM_TABS).toEqual(["All", "Active", "Private", "Scheduled", "Patient-created"]);
        expect(CHAT_ROOM_SORTS).toEqual(["Recent", "Soonest", "Members", "Name"]);
    });
});

describe("isRoomActive", () => {
    it("is true only inside the 24 hour window", () => {
        expect(isRoomActive(room({ lastMessageAtUtc: "2026-10-29T11:00:00Z" }), now)).toBe(true);
        expect(isRoomActive(room({ lastMessageAtUtc: "2026-10-28T12:00:00Z" }), now)).toBe(true);
        expect(isRoomActive(room({ lastMessageAtUtc: "2026-10-28T11:59:59Z" }), now)).toBe(false);
        expect(isRoomActive(room({ lastMessageAtUtc: "2026-10-27T11:00:00Z" }), now)).toBe(false);
        expect(isRoomActive(room(), now)).toBe(false);
    });
});

describe("isRoomScheduled", () => {
    it("is true only for a future start", () => {
        expect(isRoomScheduled(room({ scheduledStartAtUtc: "2026-10-30T09:00:00Z" }), now)).toBe(true);
        expect(isRoomScheduled(room({ scheduledStartAtUtc: "2026-10-29T09:00:00Z" }), now)).toBe(false);
        expect(isRoomScheduled(room(), now)).toBe(false);
    });
});

describe("isRoomPatientCreated", () => {
    it("requires an owner snapshot that is not a doctor", () => {
        expect(isRoomPatientCreated(room({ ownerIsDoctor: false }))).toBe(true);
        expect(isRoomPatientCreated(room({ ownerIsDoctor: true }))).toBe(false);
        expect(isRoomPatientCreated(room({ ownerDisplayName: null, ownerIsDoctor: false }))).toBe(false);
    });
});

describe("filterRooms", () => {
    const rooms = [
        room({
            id: 1,
            name: "Anxiety support",
            description: "Weekly check-ins",
            lastMessageAtUtc: "2026-10-29T11:30:00Z",
            memberCount: 4,
        }),
        room({
            id: 2,
            name: "Sleep clinic",
            description: "CBT-I follow-ups",
            lastMessageAtUtc: "2026-10-26T09:00:00Z",
            memberCount: 30,
            isPrivate: true,
            ownerIsDoctor: false,
            ownerDisplayName: "Patient AB12CD",
        }),
        room({
            id: 3,
            name: "New parents",
            description: "Open drop-in",
            scheduledStartAtUtc: "2026-10-31T17:00:00Z",
            memberCount: 9,
        }),
    ];

    it("filters by name, description and owner display name", () => {
        expect(names(filterRooms(rooms, { query: "sleep" }, now))).toEqual(["Sleep clinic"]);
        expect(names(filterRooms(rooms, { query: "cbt-i" }, now))).toEqual(["Sleep clinic"]);
        expect(names(filterRooms(rooms, { query: "ab12" }, now))).toEqual(["Sleep clinic"]);
    });

    it("applies the Active, Private, Scheduled and Patient-created tabs", () => {
        expect(names(filterRooms(rooms, { tab: "Active" }, now))).toEqual(["Anxiety support"]);
        expect(names(filterRooms(rooms, { tab: "Private" }, now))).toEqual(["Sleep clinic"]);
        expect(names(filterRooms(rooms, { tab: "Scheduled" }, now))).toEqual(["New parents"]);
        expect(names(filterRooms(rooms, { tab: "Patient-created" }, now))).toEqual(["Sleep clinic"]);
        expect(names(filterRooms(rooms, { tab: "All" }, now))).toHaveLength(3);
    });

    it("combines a tab with the search query", () => {
        expect(names(filterRooms(rooms, { tab: "Private", query: "anxiety" }, now))).toEqual([]);
        expect(names(filterRooms(rooms, { tab: "Private", query: "sleep" }, now))).toEqual(["Sleep clinic"]);
    });

    it("sorts without mutating the input", () => {
        const input = [...rooms];
        const recent = filterRooms(input, { sort: "Recent" }, now);
        expect(names(recent)).toEqual(["Anxiety support", "Sleep clinic", "New parents"]);
        expect(input.map((entry) => entry.name)).toEqual(["Anxiety support", "Sleep clinic", "New parents"]);

        expect(names(filterRooms(rooms, { sort: "Members" }, now))).toEqual([
            "Sleep clinic",
            "New parents",
            "Anxiety support",
        ]);
        expect(names(filterRooms(rooms, { sort: "Soonest" }, now))).toEqual([
            "New parents",
            "Anxiety support",
            "Sleep clinic",
        ]);
        expect(names(filterRooms(rooms, { sort: "Name" }, now))).toEqual([
            "Anxiety support",
            "New parents",
            "Sleep clinic",
        ]);
    });

    it("returns an empty list for empty input", () => {
        expect(filterRooms(undefined, {})).toEqual([]);
        expect(filterRooms([], { query: "x" })).toEqual([]);
    });
});
