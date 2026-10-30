import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    FiBold,
    FiCode,
    FiImage,
    FiItalic,
    FiLink,
    FiList,
    FiX,
} from "react-icons/fi";
import { FaQuoteLeft } from "react-icons/fa";
import { Alert, Button, Input } from "./primitives";
import {
    POST_CATEGORIES,
    POST_CONTENT_MAX_LENGTH,
    POST_MAX_TAGS,
    POST_TITLE_MAX_LENGTH,
    POST_VISIBILITY,
    POST_VISIBILITY_OPTIONS,
    clearPostDraft,
    filterTagSuggestions,
    getMediaKind,
    mediaFileError,
    mediaLimitError,
    postDraftKey,
    readPostDraft,
    writePostDraft,
} from "../../utils/postComposerConfig";

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
].join(",");

const toolbarActions = [
    { key: "bold", label: "Bold", icon: FiBold },
    { key: "italic", label: "Italic", icon: FiItalic },
    { key: "bullet", label: "Bullet list", icon: FiList },
    { key: "quote", label: "Blockquote", icon: FaQuoteLeft },
    { key: "code", label: "Code snippet", icon: FiCode },
    { key: "link", label: "Hyperlink", icon: FiLink },
];

/**
 * The post composer.
 *
 * Media is uploaded through `onUploadMedia(file, onProgress)` which must return
 * `{ url, type }`; the URL then travels with the post, so the API never sees a
 * raw file and the Cloudinary secret stays on the server. `onCreate` receives
 * the completed payload and may throw to keep the modal open.
 */
export const CreatePostModal = ({
    isVisible,
    onClose,
    onCreate,
    loading = false,
    onUploadMedia,
    onDeleteMedia,
    onSaveDraft,
    onDiscardDraft,
    groups = [],
    initialDraft = null,
    canPostDoctorsOnly = false,
    currentUserId,
    draftKey,
}) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState([]);
    const [tagQuery, setTagQuery] = useState("");
    const [isTagListOpen, setTagListOpen] = useState(false);
    const [activeSuggestion, setActiveSuggestion] = useState(0);
    const [visibility, setVisibility] = useState(POST_VISIBILITY.PUBLIC);
    const [targetGroupId, setTargetGroupId] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [media, setMedia] = useState([]);
    const [error, setError] = useState("");
    const [statusMessage, setStatusMessage] = useState("");
    const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
    const [isDragging, setDragging] = useState(false);
    const [draftId, setDraftId] = useState(null);
    const [isSavingDraft, setSavingDraft] = useState(false);

    const titleId = useId();
    const contentId = useId();
    const counterId = useId();
    const tagsId = useId();
    const tagListId = useId();
    const fileInputId = useId();
    const titleRef = useRef(null);
    const contentRef = useRef(null);
    const tagInputRef = useRef(null);
    const dialogRef = useRef(null);
    const previewUrlsRef = useRef(new Set());
    const onCloseRef = useRef(onClose);
    const cancelRef = useRef(() => onCloseRef.current?.());

    onCloseRef.current = onClose;

    const resolvedDraftKey = draftKey || postDraftKey(currentUserId);
    const storage =
        typeof window !== "undefined" ? window.localStorage : undefined;

    const suggestions = useMemo(
        () => filterTagSuggestions(tagQuery, tags),
        [tagQuery, tags]
    );
    const uploadsInProgress = media.some((item) => item.status === "uploading");
    const canPublish =
        !loading &&
        !uploadsInProgress &&
        content.trim().length > 0 &&
        POST_CATEGORIES.includes(category) &&
        (visibility !== POST_VISIBILITY.DOCTORS_ONLY || canPostDoctorsOnly) &&
        (visibility !== POST_VISIBILITY.SPECIFIC_GROUP ||
            (Boolean(targetGroupId) && groups.length > 0));
    const hasDraftableContent = Boolean(
        title.trim() ||
            content.trim() ||
            category ||
            tags.length ||
            media.length ||
            isAnonymous
    );

    const revokePreviews = () => {
        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        previewUrlsRef.current.clear();
    };

    const resetForm = () => {
        setTitle("");
        setContent("");
        setCategory("");
        setTags([]);
        setTagQuery("");
        setTagListOpen(false);
        setVisibility(POST_VISIBILITY.PUBLIC);
        setTargetGroupId("");
        setIsAnonymous(false);
        setMedia([]);
        setError("");
        setStatusMessage("");
        setDraftId(null);
        setSavingDraft(false);
    };

    useEffect(() => {
        if (!isVisible) return undefined;

        revokePreviews();
        resetForm();

        if (initialDraft?.id) {
            const draftVisibility = initialDraft.visibility === POST_VISIBILITY.DOCTORS_ONLY &&
                !canPostDoctorsOnly
                ? POST_VISIBILITY.PUBLIC
                : initialDraft.visibility || POST_VISIBILITY.PUBLIC;

            setDraftId(initialDraft.id);
            setTitle(initialDraft.title || "");
            setContent(initialDraft.content || "");
            setCategory(initialDraft.category || "");
            setTags(
                (initialDraft.tags || "")
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
            );
            setVisibility(draftVisibility);
            setTargetGroupId(initialDraft.targetGroupId || "");
            setIsAnonymous(Boolean(initialDraft.isAnonymous));
            setMedia(
                (initialDraft.media || []).map((item, index) => ({
                    id: `server-draft-${index}`,
                    kind: item.type,
                    name: `Saved ${item.type}`,
                    previewUrl: item.url,
                    url: item.url,
                    progress: 100,
                    status: "done",
                }))
            );
            setHasRestoredDraft(true);
            setStatusMessage("Draft restored from your account.");
            return () => revokePreviews();
        }

        const draft = readPostDraft(storage, resolvedDraftKey);
        if (draft) {
            setTitle(draft.title);
            setContent(draft.content);
            setCategory(draft.category);
            setTags(draft.tags);
            setVisibility(
                draft.visibility === POST_VISIBILITY.DOCTORS_ONLY &&
                    !canPostDoctorsOnly
                    ? POST_VISIBILITY.PUBLIC
                    : draft.visibility
            );
            setTargetGroupId(draft.targetGroupId || "");
            setIsAnonymous(draft.isAnonymous);
            setMedia(
                draft.media.map((item, index) => ({
                    id: `draft-${index}`,
                    kind: item.type,
                    name: `Saved ${item.type}`,
                    previewUrl: item.url,
                    url: item.url,
                    progress: 100,
                    status: "done",
                }))
            );
            setHasRestoredDraft(true);
        } else {
            setHasRestoredDraft(false);
        }

        return () => revokePreviews();
        // The form is reset only when the modal opens; resetForm and storage
        // are recreated every render and must not retrigger it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible, resolvedDraftKey, canPostDoctorsOnly, initialDraft]);

    useEffect(() => {
        if (!isVisible) return undefined;

        const previouslyFocused = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const focusTimer = window.setTimeout(() => {
            titleRef.current?.focus();
        }, 0);

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                if (!loading) cancelRef.current?.();
                return;
            }
            if (event.key !== "Tab") return;

            const dialog = dialogRef.current;
            const focusable = Array.from(
                dialog?.querySelectorAll(FOCUSABLE_SELECTOR) || []
            );
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (typeof previouslyFocused?.focus === "function") {
                previouslyFocused.focus();
            }
        };
    }, [isVisible, loading]);

    useEffect(() => {
        setActiveSuggestion(0);
    }, [tagQuery, isTagListOpen]);

    const addTag = (tag) => {
        if (!tag || tags.includes(tag) || tags.length >= POST_MAX_TAGS) return;
        setTags((previous) => [...previous, tag]);
        setTagQuery("");
        setTagListOpen(false);
        setError("");
        tagInputRef.current?.focus();
    };

    const removeTag = (tag) => {
        setTags((previous) => previous.filter((candidate) => candidate !== tag));
        tagInputRef.current?.focus();
    };

    const handleTagKeyDown = (event) => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setTagListOpen(true);
            setActiveSuggestion((previous) =>
                suggestions.length ? (previous + 1) % suggestions.length : 0
            );
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setTagListOpen(true);
            setActiveSuggestion((previous) =>
                suggestions.length
                    ? (previous - 1 + suggestions.length) % suggestions.length
                    : 0
            );
        } else if (event.key === "Enter") {
            if (!tagQuery.trim() || suggestions.length === 0) return;
            event.preventDefault();
            addTag(suggestions[activeSuggestion] || suggestions[0]);
        } else if (event.key === "Escape") {
            setTagListOpen(false);
        } else if (event.key === "Backspace" && !tagQuery && tags.length) {
            setTags((previous) => previous.slice(0, -1));
        }
    };

    const updateMediaItem = (id, patch) => {
        setMedia((previous) =>
            previous.map((item) =>
                item.id === id ? { ...item, ...patch } : item
            )
        );
    };

    const startUpload = (item) => {
        if (typeof onUploadMedia !== "function") {
            updateMediaItem(item.id, {
                status: "error",
                error: "Media uploads are unavailable.",
            });
            return;
        }

        Promise.resolve()
            .then(() =>
                onUploadMedia(item.file, (percent) => {
                    updateMediaItem(item.id, {
                        progress: Math.max(
                            0,
                            Math.min(100, Math.round(percent || 0))
                        ),
                    });
                })
            )
            .then((result) => {
                if (!result?.url) throw new Error("Missing media URL");
                updateMediaItem(item.id, {
                    status: "done",
                    url: result.url,
                    kind: result.type === "video" ? "video" : item.kind,
                    progress: 100,
                });
            })
            .catch(() => {
                updateMediaItem(item.id, {
                    status: "error",
                    error: "Upload failed. Remove it and try again.",
                });
            });
    };

    const addFiles = (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length || loading) return;

        const accepted = [];
        let nextError = "";

        files.forEach((file) => {
            const fileError = mediaFileError(file);
            if (fileError) {
                nextError = fileError;
                return;
            }

            const kind = getMediaKind(file);
            const attachedKinds = [
                ...media
                    .filter((item) => item.status !== "error")
                    .map((item) => item.kind),
                ...accepted.map((item) => item.kind),
            ];
            const limitError = mediaLimitError(attachedKinds, kind);
            if (limitError) {
                nextError = limitError;
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            previewUrlsRef.current.add(previewUrl);
            accepted.push({
                id: `${Date.now()}-${accepted.length}-${file.name}`,
                file,
                kind,
                name: file.name,
                previewUrl,
                progress: 0,
                status: "uploading",
            });
        });

        setError(nextError);
        if (!accepted.length) return;

        setMedia((previous) => [...previous, ...accepted]);
        accepted.forEach(startUpload);
    };

    const removeMedia = (id) => {
        const item = media.find((candidate) => candidate.id === id);
        if (item?.previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(item.previewUrl);
            previewUrlsRef.current.delete(item.previewUrl);
        }
        if (item?.status === "done" && item.url) {
            // A 409 is expected when the asset is attached to a saved draft;
            // the draft update removes it safely in that case.
            deleteUploadedMedia(item.url);
        }
        setMedia((previous) =>
            previous.filter((candidate) => candidate.id !== id)
        );
        setError("");
    };

    const applyFormat = (format) => {
        const textarea = contentRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart ?? content.length;
        const end = textarea.selectionEnd ?? content.length;
        const selected = content.slice(start, end);
        let insertion = "";
        let selectionStart = start + selected.length;
        let selectionEnd = selectionStart;

        if (format === "bold" || format === "italic") {
            const marker = format === "bold" ? "**" : "_";
            const text =
                selected || (format === "bold" ? "bold text" : "italic text");
            insertion = `${marker}${text}${marker}`;
            selectionStart = start + marker.length;
            selectionEnd = selectionStart + text.length;
        } else if (format === "bullet" || format === "quote") {
            const prefix = format === "bullet" ? "- " : "> ";
            insertion = selected
                ? selected
                      .split("\n")
                      .map((line) => `${prefix}${line}`)
                      .join("\n")
                : prefix;
            selectionStart = start + insertion.length;
            selectionEnd = selectionStart;
        } else if (format === "code") {
            if (selected.includes("\n")) {
                insertion = `\`\`\`\n${selected}\n\`\`\``;
                selectionStart = start + 4;
                selectionEnd = selectionStart + selected.length;
            } else {
                const text = selected || "code";
                insertion = `\`${text}\``;
                selectionStart = start + 1;
                selectionEnd = selectionStart + text.length;
            }
        } else if (format === "link") {
            const text = selected || "link text";
            insertion = `[${text}](https://)`;
            selectionStart = start + text.length + 3;
            selectionEnd = selectionStart + "https://".length;
        }

        const room =
            POST_CONTENT_MAX_LENGTH - (content.length - selected.length);
        if (insertion.length > room) {
            setError(
                `Post content is limited to ${POST_CONTENT_MAX_LENGTH.toLocaleString(
                    "en-US"
                )} characters.`
            );
            return;
        }

        const nextContent =
            content.slice(0, start) + insertion + content.slice(end);
        setContent(nextContent);
        setError("");
        window.setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(selectionStart, selectionEnd);
        }, 0);
    };

    const draftPayload = () => ({
        title: title.trim(),
        content,
        category: category || null,
        tags,
        visibility,
        targetGroupId:
            visibility === POST_VISIBILITY.SPECIFIC_GROUP && targetGroupId
                ? Number(targetGroupId)
                : null,
        isAnonymous,
        media: media
            .filter((item) => item.status === "done" && item.url)
            .map((item) => ({ url: item.url, type: item.kind })),
    });

    const handleSaveDraft = async () => {
        if (isSavingDraft || !hasDraftableContent) return;

        setSavingDraft(true);
        setError("");

        const payload = draftPayload();
        const savedLocally = writePostDraft(storage, resolvedDraftKey, payload);

        try {
            if (typeof onSaveDraft === "function") {
                const saved = await onSaveDraft(payload, draftId);
                if (saved?.id) setDraftId(saved.id);
                setStatusMessage("Draft saved to your account.");
            } else if (savedLocally) {
                const stamp = new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                });
                setStatusMessage(`Draft saved on this device at ${stamp}.`);
            } else {
                throw new Error("Draft storage is unavailable.");
            }
            setHasRestoredDraft(true);
        } catch {
            setError(
                savedLocally
                    ? "The draft could not be saved to your account. A copy is kept on this device."
                    : "The draft could not be saved. Please try again."
            );
        } finally {
            setSavingDraft(false);
        }
    };

    const discardDraft = async () => {
        if (draftId && typeof onDiscardDraft === "function") {
            try {
                await onDiscardDraft(draftId);
            } catch {
                // The local copy is still cleared; the server draft can be
                // deleted from the account later if this call failed.
            }
        }
        clearPostDraft(storage, resolvedDraftKey);
        resetForm();
        setHasRestoredDraft(false);
        titleRef.current?.focus();
    };

    const deleteUploadedMedia = (url) => {
        if (!url || typeof onDeleteMedia !== "function") return;
        Promise.resolve(onDeleteMedia(url)).catch(() => undefined);
    };

    const handleCancel = () => {
        media
            .filter((item) => item.status === "done" && item.url)
            .forEach((item) => deleteUploadedMedia(item.url));
        onCloseRef.current?.();
    };

    cancelRef.current = handleCancel;

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canPublish) {
            if (!POST_CATEGORIES.includes(category)) {
                setError("Choose a category for your post.");
            }
            return;
        }

        try {
            await onCreate?.(
                {
                    ...draftPayload(),
                    content: content.trim(),
                },
                draftId
            );
            clearPostDraft(storage, resolvedDraftKey);
            onCloseRef.current?.();
        } catch {
            // The caller reports the failure; keeping the modal open preserves
            // the text and the uploaded media so it can be retried.
        }
    };

    if (!isVisible) return null;

    const dialog = (
        <div
            className="fixed inset-0 z-modal flex items-center justify-center overflow-hidden bg-slate-950/55 p-3 sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) {
                    cancelRef.current?.();
                }
            }}
        >
            <section
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-post-title"
                className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl outline-none"
            >
                <header className="shrink-0 border-b border-neutral-200 px-5 py-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2
                                id="create-post-title"
                                className="text-xl font-bold text-neutral-900"
                            >
                                Create a post
                            </h2>
                            <p className="mt-1 text-sm text-neutral-600">
                                Share a case, a question or an update with the
                                community.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <label className="block">
                                <span className="sr-only">Audience</span>
                                <select
                                    aria-label="Audience"
                                    value={visibility}
                                    onChange={(event) =>
                                        setVisibility(event.target.value)
                                    }
                                    disabled={loading}
                                    className="select select-bordered h-10 min-h-10 w-40 rounded-xl border-neutral-300 bg-white text-sm font-semibold text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                >
                                    {POST_VISIBILITY_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                            disabled={
                                                (option.value ===
                                                    POST_VISIBILITY.DOCTORS_ONLY &&
                                                    !canPostDoctorsOnly) ||
                                                (option.value ===
                                                    POST_VISIBILITY.SPECIFIC_GROUP &&
                                                    groups.length === 0)
                                            }
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={loading}
                                aria-label="Close create post"
                                className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
                            >
                                <FiX aria-hidden="true" className="text-xl" />
                            </button>
                        </div>
                    </div>
                </header>

                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
                        {error && <Alert variant="error">{error}</Alert>}
                        {hasRestoredDraft && (
                            <Alert
                                variant="info"
                                action={
                                    <button
                                        type="button"
                                        onClick={discardDraft}
                                        disabled={loading}
                                        className="text-sm font-semibold text-primary-800 underline-offset-2 hover:underline disabled:opacity-50"
                                    >
                                        Discard draft
                                    </button>
                                }
                            >
                                We restored an unpublished draft saved for this
                                account.
                            </Alert>
                        )}

                        {visibility === POST_VISIBILITY.SPECIFIC_GROUP && (
                            <div>
                                <label
                                    htmlFor={`${titleId}-group`}
                                    className="mb-1.5 block text-sm font-semibold text-neutral-800"
                                >
                                    Group
                                    <span
                                        aria-hidden="true"
                                        className="ml-1 text-error after:content-['*']"
                                    />
                                </label>
                                <select
                                    id={`${titleId}-group`}
                                    value={targetGroupId || ""}
                                    onChange={(event) =>
                                        setTargetGroupId(event.target.value)
                                    }
                                    disabled={loading || groups.length === 0}
                                    className="select select-bordered h-11 min-h-11 w-full rounded-xl border-neutral-300 bg-white text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                >
                                    <option value="">Choose a group…</option>
                                    {groups.map((group) => (
                                        <option key={group.id} value={group.id}>
                                            {group.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-neutral-600">
                                    {groups.length === 0
                                        ? "Join a room first to share with that group."
                                        : "Only active members of the selected room can read this post."}
                                </p>
                            </div>
                        )}

                        <Input
                            id={titleId}
                            ref={titleRef}
                            label="Title (Optional)"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Give your post a clear title"
                            maxLength={POST_TITLE_MAX_LENGTH}
                            disabled={loading}
                        />

                        <fieldset disabled={loading}>
                            <legend className="mb-1.5 block text-sm font-semibold text-neutral-800">
                                Category
                                <span
                                    aria-hidden="true"
                                    className="ml-1 text-error after:content-['*']"
                                />
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {POST_CATEGORIES.map((option) => (
                                    <label
                                        key={option}
                                        className="cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            name={`post-category-${titleId}`}
                                            value={option}
                                            checked={category === option}
                                            onChange={() => {
                                                setCategory(option);
                                                setError("");
                                            }}
                                            className="peer sr-only"
                                        />
                                        <span className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 transition peer-checked:border-primary-700 peer-checked:bg-primary-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <div>
                            <label
                                htmlFor={tagsId}
                                className="mb-1.5 block text-sm font-semibold text-neutral-800"
                            >
                                Tags{" "}
                                <span className="font-normal text-neutral-600">
                                    (optional, up to {POST_MAX_TAGS})
                                </span>
                            </label>
                            <div className="relative">
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-300 bg-base-100 px-2.5 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-500/20">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-sm font-semibold text-primary-900"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                disabled={loading}
                                                aria-label={`Remove ${tag} tag`}
                                                className="grid h-5 w-5 place-items-center rounded-full text-primary-800 transition-colors hover:bg-primary/20 disabled:opacity-50"
                                            >
                                                <FiX
                                                    aria-hidden="true"
                                                    className="text-xs"
                                                />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        id={tagsId}
                                        ref={tagInputRef}
                                        type="text"
                                        role="combobox"
                                        aria-expanded={isTagListOpen}
                                        aria-controls={tagListId}
                                        aria-autocomplete="list"
                                        aria-activedescendant={
                                            isTagListOpen &&
                                            suggestions[activeSuggestion]
                                                ? `${tagListId}-${activeSuggestion}`
                                                : undefined
                                        }
                                        value={tagQuery}
                                        onChange={(event) => {
                                            setTagQuery(event.target.value);
                                            setTagListOpen(true);
                                        }}
                                        onFocus={() => setTagListOpen(true)}
                                        onBlur={() => setTagListOpen(false)}
                                        onKeyDown={handleTagKeyDown}
                                        placeholder={
                                            tags.length >= POST_MAX_TAGS
                                                ? "Tag limit reached"
                                                : "Search standard tags"
                                        }
                                        disabled={
                                            loading ||
                                            tags.length >= POST_MAX_TAGS
                                        }
                                        className="min-w-32 flex-1 border-0 bg-transparent py-1 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none disabled:cursor-not-allowed"
                                    />
                                </div>
                                {isTagListOpen && suggestions.length > 0 && (
                                    <ul
                                        id={tagListId}
                                        role="listbox"
                                        aria-label="Suggested tags"
                                        className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
                                    >
                                        {suggestions.map((tag, index) => (
                                            <li
                                                key={tag}
                                                id={`${tagListId}-${index}`}
                                                role="option"
                                                aria-selected={
                                                    index === activeSuggestion
                                                }
                                                onMouseDown={(event) =>
                                                    event.preventDefault()
                                                }
                                                onClick={() => addTag(tag)}
                                                className={`cursor-pointer px-3 py-2 text-sm ${
                                                    index === activeSuggestion
                                                        ? "bg-primary/10 font-semibold text-primary-900"
                                                        : "text-neutral-700 hover:bg-neutral-50"
                                                }`}
                                            >
                                                {tag}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                                <label
                                    htmlFor={contentId}
                                    className="block text-sm font-semibold text-neutral-800"
                                >
                                    Post content
                                    <span
                                        aria-hidden="true"
                                        className="ml-1 text-error after:content-['*']"
                                    />
                                </label>
                                <span className="text-xs font-medium text-neutral-600">
                                    Markdown supported
                                </span>
                            </div>
                            <div className="overflow-hidden rounded-xl border border-neutral-300 bg-white transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-500/20">
                                <div
                                    role="toolbar"
                                    aria-label="Text formatting"
                                    className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-2 py-1.5"
                                >
                                    {toolbarActions.map(
                                        ({ key, label, icon: Icon }) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onMouseDown={(event) =>
                                                    event.preventDefault()
                                                }
                                                onClick={() =>
                                                    applyFormat(key)
                                                }
                                                disabled={loading}
                                                aria-label={label}
                                                title={label}
                                                className="grid h-8 w-8 place-items-center rounded-lg text-neutral-600 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
                                            >
                                                <Icon aria-hidden="true" />
                                            </button>
                                        )
                                    )}
                                </div>
                                <div className="relative">
                                    <textarea
                                        id={contentId}
                                        ref={contentRef}
                                        value={content}
                                        onChange={(event) =>
                                            setContent(event.target.value)
                                        }
                                        placeholder="Write your post…"
                                        rows={7}
                                        maxLength={POST_CONTENT_MAX_LENGTH}
                                        disabled={loading}
                                        aria-describedby={counterId}
                                        className="min-h-36 w-full resize-y border-0 bg-transparent px-3 py-3 pb-8 text-sm leading-6 text-neutral-900 placeholder:text-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-50"
                                    />
                                    <span
                                        id={counterId}
                                        className={`pointer-events-none absolute bottom-2 right-3 text-xs font-medium ${
                                            content.length >
                                            POST_CONTENT_MAX_LENGTH - 100
                                                ? "text-warning-800"
                                                : "text-neutral-500"
                                        }`}
                                    >
                                        {content.length.toLocaleString("en-US")}{" "}
                                        /{" "}
                                        {POST_CONTENT_MAX_LENGTH.toLocaleString(
                                            "en-US"
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <span className="mb-1.5 block text-sm font-semibold text-neutral-800">
                                Media{" "}
                                <span className="font-normal text-neutral-600">
                                    (optional)
                                </span>
                            </span>
                            <label
                                htmlFor={fileInputId}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setDragging(false);
                                    addFiles(event.dataTransfer.files);
                                }}
                                className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition focus-within:ring-2 focus-within:ring-primary-500/30 ${
                                    isDragging
                                        ? "border-primary-700 bg-primary/10"
                                        : "border-neutral-300 bg-neutral-50 hover:border-primary-600 hover:bg-primary/5"
                                } ${loading ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                                <FiImage
                                    aria-hidden="true"
                                    className="text-2xl text-primary-700"
                                />
                                <span className="text-sm font-semibold text-neutral-800">
                                    Drag and drop media, or browse
                                </span>
                                <span className="text-xs text-neutral-600">
                                    Up to 4 images (5 MB each) and 1 short video
                                    (20 MB)
                                </span>
                                <input
                                    id={fileInputId}
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                                    onChange={(event) => {
                                        addFiles(event.target.files);
                                        event.target.value = "";
                                    }}
                                    disabled={loading}
                                    className="sr-only"
                                />
                            </label>

                            {media.length > 0 && (
                                <ul
                                    aria-label="Attached media"
                                    className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
                                >
                                    {media.map((item) => (
                                        <li
                                            key={item.id}
                                            className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
                                        >
                                            {item.kind === "video" ? (
                                                <video
                                                    src={item.previewUrl}
                                                    aria-label={item.name}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    className="h-24 w-full object-cover"
                                                />
                                            ) : (
                                                <img
                                                    src={item.previewUrl}
                                                    alt={item.name}
                                                    className="h-24 w-full object-cover"
                                                />
                                            )}
                                            {item.status === "uploading" && (
                                                <div className="absolute inset-x-0 bottom-0 bg-white/95 px-2 pb-1.5 pt-1">
                                                    <div
                                                        role="progressbar"
                                                        aria-label={`Uploading ${item.name}`}
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={
                                                            item.progress
                                                        }
                                                        className="h-1.5 overflow-hidden rounded-full bg-neutral-200"
                                                    >
                                                        <div
                                                            className="h-full rounded-full bg-primary-700 transition-all"
                                                            style={{
                                                                width: `${item.progress}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="mt-0.5 text-center text-[10px] font-semibold text-neutral-700">
                                                        {item.progress}%
                                                    </p>
                                                </div>
                                            )}
                                            {item.status === "error" && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-rose-950/70 p-3 text-center text-xs font-semibold text-white">
                                                    {item.error ||
                                                        "Upload failed"}
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeMedia(item.id)
                                                }
                                                disabled={loading}
                                                aria-label={`Remove ${item.name}`}
                                                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-neutral-700 shadow transition-colors hover:bg-white disabled:opacity-50"
                                            >
                                                <FiX aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <label className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-neutral-900">
                                    Post anonymously
                                </span>
                                <span className="mt-0.5 block text-xs leading-5 text-neutral-600">
                                    Your name and photo stay hidden. Anonymous
                                    posts appear under Confessions.
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                role="switch"
                                checked={isAnonymous}
                                onChange={(event) =>
                                    setIsAnonymous(event.target.checked)
                                }
                                disabled={loading}
                                className="toggle toggle-primary shrink-0"
                            />
                        </label>
                    </div>

                    <footer className="shrink-0 border-t border-neutral-200 bg-white px-5 py-3 sm:px-6">
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p
                                role="status"
                                aria-live="polite"
                                className="text-xs font-medium text-neutral-600"
                            >
                                {statusMessage}
                            </p>
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    variant="ghost"
                                    onClick={handleCancel}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleSaveDraft}
                                    loading={isSavingDraft}
                                    loadingText="Saving…"
                                    disabled={
                                        loading ||
                                        uploadsInProgress ||
                                        !hasDraftableContent
                                    }
                                >
                                    Save Draft
                                </Button>
                                <Button
                                    type="submit"
                                    loading={loading}
                                    loadingText="Publishing…"
                                    disabled={!canPublish}
                                >
                                    Publish
                                </Button>
                            </div>
                        </div>
                    </footer>
                </form>
            </section>
        </div>
    );

    const modalRoot =
        typeof document !== "undefined"
            ? document.getElementById("modal-root")
            : null;
    return modalRoot ? createPortal(dialog, modalRoot) : dialog;
};
