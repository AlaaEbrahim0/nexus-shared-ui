// Shared timestamp label for the community and notification surfaces.
//
// The API stores instants in UTC, and several payloads (EF projections) serialise
// them without a zone designator, so a bare string is treated as UTC rather than
// silently reinterpreted in the browser's zone.
//
// The name says what it returns: a relative label such as "3 days ago", not the
// absolute date an earlier revision produced.

const HAS_ZONE = /([zZ]|[+-]\d{2}:?\d{2})$/;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30.44 * DAY;
const YEAR = 365 * DAY;

export function parseUtcDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const text = String(value).trim();
    const asUtc = new Date(HAS_ZONE.test(text) ? text : `${text}Z`);
    if (!Number.isNaN(asUtc.getTime())) return asUtc;

    // A value that was already formatted by a caller ("28 Oct 2026") has no zone
    // to add; parse it as written rather than returning nothing.
    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * "just now", "4 hours ago", "in 2 days" - or an empty string when there is
 * nothing usable to show. Never "Invalid date".
 */
export function convertUtcToRelativeTime(value) {
    const date = parseUtcDate(value);
    if (!date) return "";

    const delta = date.getTime() - Date.now();
    const offset = Math.abs(delta);
    // numeric: "always" keeps the label predictable ("1 week ago" rather than
    // "last week"), which matters because these strings are asserted in tests.
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });

    const describe = (unitMs, unit, underAMinuteLabel) => {
        if (underAMinuteLabel && offset < 45 * SECOND) return underAMinuteLabel;
        return formatter.format(Math.round(delta / unitMs), unit);
    };

    if (offset < MINUTE) return describe(SECOND, "second", "just now");
    if (offset < HOUR) return describe(MINUTE, "minute");
    if (offset < DAY) return describe(HOUR, "hour");
    if (offset < WEEK) return describe(DAY, "day");
    if (offset < MONTH) return describe(WEEK, "week");
    if (offset < YEAR) return describe(MONTH, "month");
    return describe(YEAR, "year");
}

export default convertUtcToRelativeTime;
