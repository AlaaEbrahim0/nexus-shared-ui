// Presentation logic for the content-safety check that runs before a post,
// comment, reply, or chat message is saved.
//
// The check is performed by a hosted model that goes idle when nobody uses it,
// so the first submission after a quiet period can take tens of seconds while
// the rest finish in under a second. The user should never have to guess whether
// the app has frozen, and a check that never finished must never be presented as
// a policy violation.

/**
 * How long a submission waits before the browser gives up.
 *
 * The API caps a moderation attempt sequence at MLServer:TimeoutSeconds (45s by
 * default). The client must outlast it, otherwise the portal reports a timeout
 * while the server is still working and the user retries a post that was about
 * to be saved.
 */
export const MODERATION_REQUEST_TIMEOUT_MS = 60000;

/** Error codes that mean "no moderation decision was produced", not "content rejected". */
const MODERATION_UNAVAILABLE_CODES = [
    "ExternalServices.HateSpeechDetectionServiceUnavailable",
    "ExternalServices.ContentSafetyServiceUnavailable",
    "Chat.ModerationUnavailable",
];

/** Error codes that mean the model ran and said no. */
const MODERATION_REJECTION_CODES = [
    "Content.Forbidden",
    "Chat.ContentRejected",
];

const STAGES = [
    {
        id: "checking",
        fromMs: 0,
        label: "Checking your content",
        detail: "",
    },
    {
        id: "waking",
        fromMs: 4000,
        label: "Waking up the moderation service",
        detail:
            "The content safety service may take a little longer to start after being inactive. Your content is still being checked.",
    },
    {
        id: "still-checking",
        fromMs: 15000,
        label: "Still checking your content",
        detail:
            "This is taking longer than usual, but nothing has been lost. The check usually finishes within a minute.",
    },
];

/**
 * The stage to display for a check that has been running for `elapsedMs`.
 *
 * Derived from elapsed time alone, so a fast answer never shows an apology and
 * a slow one explains itself. Returns null when nothing is in flight.
 */
export const moderationStage = (elapsedMs) => {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return null;

    let stage = STAGES[0];
    for (const candidate of STAGES) {
        if (elapsedMs >= candidate.fromMs) stage = candidate;
    }
    return stage;
};

/** Short label only, for a button that has no room for an explanation. */
export const moderationStageLabel = (elapsedMs) => moderationStage(elapsedMs)?.label ?? null;

/** True when the failure is "we could not check this" rather than "this is not allowed". */
export const isModerationUnavailableError = (error) =>
    moderationCodesOf(error).some((code) => MODERATION_UNAVAILABLE_CODES.includes(code));

/** True when the model actually answered and rejected the content. */
export const isModerationRejectionError = (error) =>
    moderationCodesOf(error).some((code) => MODERATION_REJECTION_CODES.includes(code));

/**
 * Copy for a submission that could not be checked. It says plainly that no
 * decision exists, which is the opposite of accusing the author.
 */
export const moderationUnavailableMessage = (noun = "content") =>
    `The safety check couldn't finish, so your ${noun} was not published. It wasn't rejected - we just couldn't check it. Your text is still here if you want to try again.`;

/**
 * The API answers with RFC 7807 problem details. Depending on which layer
 * caught it, that is either the payload itself (community.api.js rethrows
 * `error.response.data`) or an axios error still holding it, and the reason code
 * sits in the `errors` array or the top-level `type`/`title`.
 */
function moderationCodesOf(error) {
    if (!error || typeof error !== "object") return [];

    const payload = error.response?.data ?? error;
    const codes = [];

    const entries = Array.isArray(payload?.errors) ? payload.errors : [];
    for (const entry of entries) {
        if (typeof entry?.code === "string") codes.push(entry.code);
    }

    if (typeof payload?.type === "string") codes.push(payload.type);

    return codes;
}
