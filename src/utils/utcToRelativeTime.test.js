import { convertUtcToRelativeTime, parseUtcDate } from "./utcToRelativeTime";

const minutesAgo = (n) => new Date(Date.now() - n * 60000).toISOString();
const hoursAgo = (n) => new Date(Date.now() - n * 3600000).toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

describe("parseUtcDate", () => {
    it("treats a designator-free string as UTC, not browser-local", () => {
        const naive = parseUtcDate("2026-03-01 14:30:00");
        expect(naive).not.toBeNull();
        expect(naive.getUTCFullYear()).toBe(2026);
        expect(naive.getUTCHours()).toBe(14);
        expect(naive.getUTCMinutes()).toBe(30);
    });

    it("keeps an explicit offset instead of shifting it", () => {
        expect(parseUtcDate("2026-03-01T14:30:00+02:00").getTime())
            .toBe(parseUtcDate("2026-03-01T14:30:00+02:00").getTime());
        expect(parseUtcDate("2026-03-01T12:30:00Z").getUTCHours()).toBe(12);
    });

    it("returns null for unusable input rather than an Invalid Date", () => {
        for (const value of [null, undefined, "", "  ", "not a date", {}, []]) {
            expect(parseUtcDate(value)).toBeNull();
        }
    });
});

describe("convertUtcToRelativeTime", () => {
    it("describes recent activity relatively", () => {
        expect(convertUtcToRelativeTime(minutesAgo(1))).toBe("1 minute ago");
        expect(convertUtcToRelativeTime(minutesAgo(20))).toBe("20 minutes ago");
        expect(convertUtcToRelativeTime(hoursAgo(3))).toBe("3 hours ago");
        expect(convertUtcToRelativeTime(daysAgo(2))).toBe("2 days ago");
    });

    it("rolls up to weeks, months and years for older posts", () => {
        expect(convertUtcToRelativeTime(daysAgo(10))).toBe("1 week ago");
        expect(convertUtcToRelativeTime(daysAgo(70))).toBe("2 months ago");
        expect(convertUtcToRelativeTime(daysAgo(800))).toBe("2 years ago");
    });

    it("handles EF projections that omit the zone designator", () => {
        // A fixed past date, so the exact unit depends on when the suite runs.
        expect(convertUtcToRelativeTime("2026-01-01 09:00:00")).toMatch(/\b(month|year)s? ago$/);
    });

    it("describes a future slot as being ahead rather than ago", () => {
        expect(convertUtcToRelativeTime(new Date(Date.now() + 3 * 86400000).toISOString()))
            .toBe("in 3 days");
    });

    it("never renders Invalid date for anything unusable", () => {
        for (const value of [null, undefined, "", "junk", NaN, 0, {}, "Invalid Date"]) {
            expect(convertUtcToRelativeTime(value)).toBe("");
        }
    });

    it("returns an empty label, not a crash, for a value that is already formatted", () => {
        // Callers must pass the raw instant. A label fed back in cannot be
        // parsed, and the contract is a blank string rather than "Invalid date".
        expect(convertUtcToRelativeTime("2 days ago")).toBe("");
    });
});
