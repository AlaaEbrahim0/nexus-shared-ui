import {
    REACTION_KINDS,
    deriveReactionState,
    getReactionMeta,
    mergeChatReactionUpdate,
    normalizeReaction,
    normalizeReactionSummaries,
} from "./reactions";

describe("normalizeReaction", () => {
    it("trims and lower-cases the token the API stores", () => {
        expect(normalizeReaction("  Love ")).toBe("love");
    });

    it("returns an empty string instead of throwing on a missing value", () => {
        expect(normalizeReaction(undefined)).toBe("");
        expect(normalizeReaction(null)).toBe("");
    });
});

describe("getReactionMeta", () => {
    it("resolves every token in the vocabulary", () => {
        REACTION_KINDS.forEach(({ value }) => {
            expect(getReactionMeta(value).value).toBe(value);
        });
    });

    it("rejects a token the API does not issue", () => {
        expect(getReactionMeta("angry")).toBeNull();
    });
});

describe("normalizeReactionSummaries", () => {
    it("merges a duplicated token and keeps the server order", () => {
        expect(
            normalizeReactionSummaries([
                { reaction: "love", count: 2 },
                { reaction: "like", count: 5 },
                { reaction: "love", count: 1 },
            ])
        ).toEqual([
            { reaction: "love", count: 3 },
            { reaction: "like", count: 5 },
        ]);
    });

    it("drops unknown tokens and zero counts", () => {
        expect(
            normalizeReactionSummaries([
                { reaction: "angry", count: 4 },
                { reaction: "wow", count: 0 },
                { reaction: "sad", count: 2 },
            ])
        ).toEqual([{ reaction: "sad", count: 2 }]);
    });

    it("survives a payload without the reactions field", () => {
        expect(normalizeReactionSummaries(undefined)).toEqual([]);
    });
});

describe("deriveReactionState", () => {
    it("prefers the generic reaction payload when present", () => {
        expect(
            deriveReactionState({
                reactions: [{ reaction: "haha", count: 3 }],
                myReaction: "Haha",
                likesCount: 99,
                isLikedByCurrentUser: true,
            })
        ).toEqual({
            reactions: [{ reaction: "haha", count: 3 }],
            myReaction: "haha",
        });
    });

    it("maps a legacy like payload onto the like reaction", () => {
        expect(
            deriveReactionState({ likesCount: 7, isLikedByCurrentUser: true })
        ).toEqual({
            reactions: [{ reaction: "like", count: 7 }],
            myReaction: "like",
        });
    });

    it("keeps a like count visible when the viewer is not the one who liked", () => {
        expect(
            deriveReactionState({ likesCount: 2, isLikedByCurrentUser: false })
        ).toEqual({
            reactions: [{ reaction: "like", count: 2 }],
            myReaction: null,
        });
    });

    it("is empty when nothing has been reacted", () => {
        expect(deriveReactionState({})).toEqual({ reactions: [], myReaction: null });
    });

    it("ignores an unknown myReaction", () => {
        expect(
            deriveReactionState({
                reactions: [{ reaction: "like", count: 1 }],
                myReaction: "angry",
            }).myReaction
        ).toBeNull();
    });
});

describe("mergeChatReactionUpdate", () => {
    const message = { id: 42, myReaction: "like", reactions: [{ reaction: "like", count: 1 }] };
    const update = {
        messageId: 42,
        reactions: [{ reaction: "like", count: 3 }, { reaction: "love", count: 1 }],
        actorMemberId: 7,
        actorReaction: "love",
    };

    it("takes the broadcast counts as authoritative for every viewer", () => {
        expect(mergeChatReactionUpdate(message, update, 99).reactions).toEqual(
            update.reactions
        );
    });

    it("moves myReaction only for the actor", () => {
        expect(mergeChatReactionUpdate(message, update, 7).myReaction).toBe("love");
        expect(mergeChatReactionUpdate(message, update, 99).myReaction).toBe("like");
    });

    it("clears the actor reaction when the broadcast says it was removed", () => {
        expect(
            mergeChatReactionUpdate(message, { ...update, actorReaction: null }, 7)
                .myReaction
        ).toBeNull();
    });

    it("leaves an unrelated message untouched", () => {
        expect(mergeChatReactionUpdate(message, { ...update, messageId: 43 }, 7)).toBe(
            message
        );
    });
});
