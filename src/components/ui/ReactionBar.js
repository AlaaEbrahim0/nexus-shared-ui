import { useEffect, useRef, useState } from "react";
import { FiSmile } from "react-icons/fi";
import {
    REACTION_KINDS,
    getReactionMeta,
    normalizeReaction,
    normalizeReactionSummaries,
} from "../../utils/reactions";

/**
 * The reaction strip used by posts, comments, replies and chat messages.
 *
 * Existing reactions are rendered as count chips; the picker lists the fixed
 * vocabulary. Choosing the reaction you already have removes it, which makes
 * the whole strip a single toggle surface instead of a separate "unlike".
 *
 * The picker is click/tap driven (not hover-only) and closes on Escape or an
 * outside click so it stays usable with a keyboard and on touch screens.
 */
export const ReactionBar = ({
    reactions = [],
    myReaction = null,
    onReact,
    onRemove,
    disabled = false,
    className = "",
}) => {
    const [isOpen, setOpen] = useState(false);
    const rootRef = useRef(null);

    const mine = getReactionMeta(myReaction) ? normalizeReaction(myReaction) : null;
    const mineMeta = getReactionMeta(mine);
    const summaries = normalizeReactionSummaries(reactions);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const choose = (reaction) => {
        setOpen(false);
        if (disabled) return;

        if (reaction === mine) {
            onRemove?.();
        } else {
            onReact?.(reaction);
        }
    };

    const toggle = (reaction) => {
        if (disabled) return;

        if (reaction === mine) {
            onRemove?.();
        } else {
            onReact?.(reaction);
        }
    };

    return (
        <div
            ref={rootRef}
            className={`relative inline-flex flex-wrap items-center gap-1 ${className}`}
        >
            {summaries.map(({ reaction, count }) => {
                const meta = getReactionMeta(reaction);
                if (!meta) return null;

                const isMine = reaction === mine;

                return (
                    <button
                        key={reaction}
                        type="button"
                        onClick={() => toggle(reaction)}
                        disabled={disabled}
                        aria-pressed={isMine}
                        aria-label={`${meta.label}: ${count}${
                            isMine ? ", your reaction" : ""
                        }`}
                        title={
                            isMine
                                ? `${meta.label} (click to remove)`
                                : meta.label
                        }
                        className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-60 ${
                            isMine
                                ? "border-primary-700 bg-primary/10 text-primary-900"
                                : "border-neutral-200 bg-base-100 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
                        }`}
                    >
                        <span aria-hidden="true">{meta.emoji}</span>
                        <span className="text-xs font-semibold tabular-nums">
                            {count}
                        </span>
                    </button>
                );
            })}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((open) => !open)}
                    disabled={disabled}
                    aria-label={
                        mineMeta
                            ? `Change reaction (currently ${mineMeta.label})`
                            : "Add a reaction"
                    }
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    title="React"
                    className={`grid h-8 min-w-8 place-items-center rounded-full border px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-60 ${
                        isOpen
                            ? "border-primary-700 bg-primary/10"
                            : "border-neutral-200 bg-base-100 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                    }`}
                >
                    {mineMeta ? (
                        <span aria-hidden="true" className="text-base">
                            {mineMeta.emoji}
                        </span>
                    ) : (
                        <FiSmile aria-hidden="true" className="text-base" />
                    )}
                </button>

                {isOpen && (
                    <div
                        role="menu"
                        aria-label="Choose a reaction"
                        className="absolute bottom-full left-0 z-30 mb-1 flex items-center gap-0.5 rounded-full border border-neutral-200 bg-base-100 p-1 shadow-lg"
                    >
                        {REACTION_KINDS.map(({ value, emoji, label }) => {
                            const isMine = value === mine;

                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => choose(value)}
                                    aria-label={
                                        isMine
                                            ? `Remove ${label} reaction`
                                            : `React with ${label}`
                                    }
                                    title={label}
                                    className={`grid h-9 w-9 place-items-center rounded-full text-lg transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${
                                        isMine ? "bg-primary/10" : ""
                                    }`}
                                >
                                    <span aria-hidden="true">{emoji}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
