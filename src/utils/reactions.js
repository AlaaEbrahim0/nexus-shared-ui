/**
 * The reaction vocabulary shared by posts, comments, replies and chat
 * messages.
 *
 * The API stores and validates the lower-case token ("like", "love", ...);
 * the emoji is presentation only. Keep this list in the same order as
 * Domain/Enums/ReactionKinds.cs.
 */
export const REACTION_KINDS = [
    { value: "like", emoji: "👍", label: "Like" },
    { value: "love", emoji: "❤️", label: "Love" },
    { value: "haha", emoji: "😂", label: "Haha" },
    { value: "wow", emoji: "😮", label: "Wow" },
    { value: "sad", emoji: "😢", label: "Sad" },
];

const REACTION_BY_VALUE = new Map(
    REACTION_KINDS.map((reaction) => [reaction.value, reaction])
);

export const normalizeReaction = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

export const getReactionMeta = (value) =>
    REACTION_BY_VALUE.get(normalizeReaction(value)) || null;

/**
 * Keep only known reactions with a positive count, preserving the server's
 * ordering (most used first) and merging any duplicate token.
 */
export const normalizeReactionSummaries = (reactions) => {
    if (!Array.isArray(reactions)) return [];

    const counts = new Map();
    reactions.forEach((item) => {
        const value = normalizeReaction(item?.reaction);
        const count = Number(item?.count);
        if (!REACTION_BY_VALUE.has(value) || !Number.isFinite(count) || count <= 0) {
            return;
        }

        counts.set(value, (counts.get(value) || 0) + Math.trunc(count));
    });

    return Array.from(counts.entries()).map(([reaction, count]) => ({
        reaction,
        count,
    }));
};

/**
 * Older payloads only carried likesCount/isLikedByCurrentUser. Deriving the
 * reaction state here keeps those callers working while new payloads use the
 * generic reaction fields.
 */
export const deriveReactionState = ({
    reactions,
    myReaction,
    likesCount = 0,
    isLikedByCurrentUser = false,
}) => {
    const normalized = normalizeReactionSummaries(reactions);
    const normalizedMine = getReactionMeta(myReaction) ? normalizeReaction(myReaction) : null;

    if (normalized.length > 0 || normalizedMine) {
        return { reactions: normalized, myReaction: normalizedMine };
    }

    if (isLikedByCurrentUser || likesCount > 0) {
        return {
            reactions: [{ reaction: "like", count: Math.max(0, Math.trunc(likesCount)) }],
            myReaction: isLikedByCurrentUser ? "like" : null,
        };
    }

    return { reactions: [], myReaction: null };
};

/**
 * Apply a neutral MessageReactionsUpdated payload to one chat message.
 *
 * The broadcast is identical for every viewer, so the actor's new reaction is
 * resolved locally: only the actor changes myReaction; everybody else keeps
 * theirs. The counts are authoritative.
 */
export const mergeChatReactionUpdate = (message, update, myMemberId) => {
    if (!message || !update || message.id !== update.messageId) {
        return message;
    }

    const isActor =
        update.actorMemberId != null &&
        myMemberId != null &&
        update.actorMemberId === myMemberId;

    return {
        ...message,
        reactions: normalizeReactionSummaries(update.reactions),
        myReaction: isActor
            ? (getReactionMeta(update.actorReaction)
                ? normalizeReaction(update.actorReaction)
                : null)
            : (getReactionMeta(message.myReaction)
                ? normalizeReaction(message.myReaction)
                : null),
    };
};
