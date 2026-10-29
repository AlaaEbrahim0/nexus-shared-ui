import {
    MODERATION_REQUEST_TIMEOUT_MS,
    isModerationRejectionError,
    isModerationUnavailableError,
    moderationStage,
    moderationStageLabel,
    moderationUnavailableMessage,
} from "./moderationState";

describe("moderationStage", () => {
    it("starts with a plain in-progress label and no apology", () => {
        expect(moderationStage(0)).toMatchObject({ id: "checking", detail: "" });
        expect(moderationStage(1500)?.detail).toBe("");
    });

    it("only explains the slow start once the request is actually late", () => {
        expect(moderationStage(3999)?.id).toBe("checking");
        expect(moderationStage(4000)?.id).toBe("waking");
    });

    it("keeps the user informed during a long cold start", () => {
        expect(moderationStage(14999)?.id).toBe("waking");
        expect(moderationStage(15000)?.id).toBe("still-checking");
        expect(moderationStage(90000)?.id).toBe("still-checking");
    });

    it("says nothing when no check is in flight", () => {
        expect(moderationStage(null)).toBeNull();
        expect(moderationStage(undefined)).toBeNull();
        expect(moderationStage(-1)).toBeNull();
        expect(moderationStage(NaN)).toBeNull();
        expect(moderationStageLabel(0)).toBe("Checking your content");
        expect(moderationStageLabel(null)).toBeNull();
    });

    it("never reveals infrastructure detail in the copy it shows", () => {
        for (const elapsed of [0, 5000, 20000]) {
            const stage = moderationStage(elapsed);
            const text = `${stage.label} ${stage.detail}`.toLowerCase();
            expect(text).not.toContain("render");
            expect(text).not.toContain("http");
            expect(text).not.toContain("timeout");
            expect(text).not.toContain("stack");
        }
    });
});

describe("MODERATION_REQUEST_TIMEOUT_MS", () => {
    it("outlasts the server's own moderation budget so the client never gives up first", () => {
        // The API caps a moderation attempt sequence at 45s (MLServer:TimeoutSeconds).
        expect(MODERATION_REQUEST_TIMEOUT_MS).toBeGreaterThan(45000);
    });
});

/** The community api module rethrows `error.response.data`, so a bare ProblemDetails. */
const problemDetails = (code) => ({
    type: "https://tools.ietf.org/html/rfc9110#section-15.6.1",
    title: "Service Unavailable",
    status: 503,
    detail: "The content safety check could not be completed.",
    errors: [{ code, description: "boom", type: "ServiceUnavailable" }],
});

/** The chat api module keeps the axios error intact. */
const axiosError = (payload) => ({ isAxiosError: true, message: "Request failed", response: { status: payload.status, data: payload } });

describe("isModerationUnavailableError", () => {
    it("recognises the community failure in both shapes it arrives in", () => {
        expect(isModerationUnavailableError(problemDetails("ExternalServices.HateSpeechDetectionServiceUnavailable"))).toBe(true);
        expect(isModerationUnavailableError(axiosError(problemDetails("ExternalServices.HateSpeechDetectionServiceUnavailable")))).toBe(true);
    });

    it("recognises the chat failure", () => {
        expect(isModerationUnavailableError(axiosError(problemDetails("Chat.ModerationUnavailable")))).toBe(true);
    });

    it("does not call a policy rejection an unavailable check", () => {
        expect(isModerationUnavailableError(problemDetails("Content.Forbidden"))).toBe(false);
        expect(isModerationUnavailableError(problemDetails("Chat.ContentRejected"))).toBe(false);
    });

    it("does not call an unrelated outage a failed check", () => {
        // Storage failures are also 503s with an ExternalServices code; claiming
        // the safety check failed would send the user to retry the wrong thing.
        expect(isModerationUnavailableError(problemDetails("ExternalServices.StorageServiceUnavailable"))).toBe(false);
        expect(isModerationUnavailableError(problemDetails("Chat.RoomArchived"))).toBe(false);
    });

    it("tolerates missing and malformed input", () => {
        for (const value of [null, undefined, "boom", 42, {}, { response: {} }, { errors: "not-an-array" }]) {
            expect(isModerationUnavailableError(value)).toBe(false);
        }
    });
});

describe("isModerationRejectionError", () => {
    it("recognises a real policy decision", () => {
        expect(isModerationRejectionError(problemDetails("Content.Forbidden"))).toBe(true);
        expect(isModerationRejectionError(axiosError(problemDetails("Chat.ContentRejected")))).toBe(true);
    });

    it("does not treat an unfinished check as a rejection", () => {
        expect(isModerationRejectionError(problemDetails("ExternalServices.HateSpeechDetectionServiceUnavailable"))).toBe(false);
    });
});

describe("moderationUnavailableMessage", () => {
    it("states that no decision exists instead of accusing the author", () => {
        const message = moderationUnavailableMessage("post");
        expect(message).toContain("post");
        expect(message.toLowerCase()).toContain("wasn't rejected");
        expect(message.toLowerCase()).not.toContain("violat");
        expect(message.toLowerCase()).not.toContain("hate speech");
    });

    it("tells the user their draft survived", () => {
        expect(moderationUnavailableMessage("comment").toLowerCase()).toContain("still here");
    });
});
