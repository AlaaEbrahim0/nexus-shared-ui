import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiArrowRight, FiBold, FiCode, FiImage, FiItalic, FiLink, FiList, FiX } from "react-icons/fi";
import { FaQuoteLeft } from "react-icons/fa";
import { Alert, Button, Modal } from "./primitives";
import { getApiErrorMessage } from "../../api/client";
import {
    POST_CATEGORIES,
    POST_CONTENT_MAX_LENGTH,
    POST_MAX_TAGS,
    POST_TITLE_MAX_LENGTH,
    POST_VISIBILITY,
    POST_VISIBILITY_OPTIONS,
    getMediaKind,
    mediaFileError,
    mediaLimitError,
} from "../../utils/postComposerConfig";

const toolbar = [
    { key: "bold", label: "Bold", icon: FiBold },
    { key: "italic", label: "Italic", icon: FiItalic },
    { key: "bullet", label: "Bullet list", icon: FiList },
    { key: "quote", label: "Blockquote", icon: FaQuoteLeft },
    { key: "code", label: "Code snippet", icon: FiCode },
    { key: "link", label: "Hyperlink", icon: FiLink },
];

const toMediaItems = (initialData) => {
    const source = Array.isArray(initialData?.media) && initialData.media.length
        ? initialData.media
        : initialData?.postPhoto
            ? [{ url: initialData.postPhoto, type: "image" }]
            : [];

    return source
        .filter((item) => item?.url)
        .map((item, index) => ({
            id: `existing-${index}`,
            url: item.url,
            kind: item.type === "video" ? "video" : "image",
            previewUrl: item.url,
            status: "done",
            progress: 100,
            isNew: false,
        }));
};

const toTags = (value) =>
    typeof value === "string"
        ? value.split(",").map((tag) => tag.trim()).filter(Boolean)
        : Array.isArray(value)
            ? value
            : [];

export const UpdatePostModal = ({
    isVisible,
    onClose,
    onUpdate,
    loading = false,
    initialData,
    groups = [],
    canPostDoctorsOnly = false,
    onUploadMedia,
    onDeleteMedia,
}) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState([]);
    const [visibility, setVisibility] = useState(POST_VISIBILITY.PUBLIC);
    const [targetGroupId, setTargetGroupId] = useState("");
    const [isAnonymous, setAnonymous] = useState(false);
    const [media, setMedia] = useState([]);
    const [error, setError] = useState("");
    const contentRef = useRef(null);
    const mediaInputRef = useRef(null);
    const previewUrls = useRef(new Set());

    useEffect(() => {
        if (!isVisible) return;

        setTitle(initialData?.title || "");
        setContent(initialData?.content || "");
        setCategory(initialData?.category || "");
        setTags(toTags(initialData?.tags));
        setVisibility(initialData?.visibility || POST_VISIBILITY.PUBLIC);
        setTargetGroupId(initialData?.targetGroupId ? String(initialData.targetGroupId) : "");
        setAnonymous(Boolean(initialData?.isAnonymous));
        setMedia(toMediaItems(initialData));
        setError("");
        if (mediaInputRef.current) mediaInputRef.current.value = "";
    }, [isVisible, initialData?.id]);

    useEffect(() => () => {
        previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
        previewUrls.current.clear();
    }, []);

    const uploadsInProgress = media.some((item) => item.status === "uploading");
    const canSave =
        !loading &&
        !uploadsInProgress &&
        content.trim().length > 0 &&
        POST_CATEGORIES.includes(category) &&
        (visibility !== POST_VISIBILITY.DOCTORS_ONLY || canPostDoctorsOnly) &&
        (visibility !== POST_VISIBILITY.SPECIFIC_GROUP || Boolean(targetGroupId));

    const refreshMedia = (id, patch) => {
        setMedia((previous) => previous.map((item) => item.id === id ? { ...item, ...patch } : item));
    };

    const startUpload = (item) => {
        if (typeof onUploadMedia !== "function") {
            refreshMedia(item.id, { status: "error", error: "Uploads are unavailable." });
            return;
        }

        Promise.resolve(onUploadMedia(item.file, (percent) => {
            refreshMedia(item.id, { progress: Math.max(0, Math.min(100, Math.round(percent || 0))) });
        }))
            .then((result) => {
                if (!result?.url) throw new Error("Missing media URL");
                refreshMedia(item.id, {
                    status: "done",
                    url: result.url,
                    kind: result.type === "video" ? "video" : item.kind,
                    progress: 100,
                });
            })
            .catch(() => {
                refreshMedia(item.id, { status: "error", error: "Upload failed. Remove it and try again." });
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
                ...media.filter((item) => item.status !== "error").map((item) => item.kind),
                ...accepted.map((item) => item.kind),
            ];
            const limitError = mediaLimitError(attachedKinds, kind);
            if (limitError) {
                nextError = limitError;
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            previewUrls.current.add(previewUrl);
            accepted.push({
                id: `new-${Date.now()}-${accepted.length}-${file.name}`,
                file,
                kind,
                previewUrl,
                progress: 0,
                status: "uploading",
                isNew: true,
            });
        });

        setError(nextError);
        if (!accepted.length) return;
        setMedia((previous) => [...previous, ...accepted]);
        accepted.forEach(startUpload);
    };

    const removeMedia = (id) => {
        const item = media.find((candidate) => candidate.id === id);
        if (item?.isNew && item.url && typeof onDeleteMedia === "function") {
            Promise.resolve(onDeleteMedia(item.url)).catch(() => undefined);
        }
        if (item?.previewUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(item.previewUrl);
            previewUrls.current.delete(item.previewUrl);
        }
        setMedia((previous) => previous.filter((candidate) => candidate.id !== id));
    };

    const moveMedia = (index, direction) => {
        setMedia((previous) => {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= previous.length) return previous;
            const copy = [...previous];
            [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
            return copy;
        });
    };

    const toggleTag = (tag) => {
        setTags((previous) => previous.includes(tag)
            ? previous.filter((item) => item !== tag)
            : previous.length >= POST_MAX_TAGS ? previous : [...previous, tag]);
    };

    const insertFormat = (format) => {
        const textarea = contentRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart ?? content.length;
        const end = textarea.selectionEnd ?? content.length;
        const selected = content.slice(start, end);
        let insertion;
        let selectionStart;
        let selectionEnd;

        if (format === "bold" || format === "italic") {
            const marker = format === "bold" ? "**" : "_";
            const text = selected || (format === "bold" ? "bold text" : "italic text");
            insertion = `${marker}${text}${marker}`;
            selectionStart = start + marker.length;
            selectionEnd = selectionStart + text.length;
        } else if (format === "bullet" || format === "quote") {
            const prefix = format === "bullet" ? "- " : "> ";
            insertion = selected
                ? selected.split("\n").map((line) => `${prefix}${line}`).join("\n")
                : prefix;
            selectionStart = start + insertion.length;
            selectionEnd = selectionStart;
        } else if (format === "code") {
            const text = selected || "code";
            insertion = selected.includes("\n") ? `\`\`\`\n${text}\n\`\`\`` : `\`${text}\``;
            selectionStart = start + 1;
            selectionEnd = selectionStart + text.length;
        } else {
            const text = selected || "link text";
            insertion = `[${text}](https://)`;
            selectionStart = start + text.length + 3;
            selectionEnd = selectionStart + "https://".length;
        }

        if (content.length - selected.length + insertion.length > POST_CONTENT_MAX_LENGTH) {
            setError(`Post content is limited to ${POST_CONTENT_MAX_LENGTH.toLocaleString("en-US")} characters.`);
            return;
        }

        setContent(content.slice(0, start) + insertion + content.slice(end));
        setError("");
        window.setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(selectionStart, selectionEnd);
        }, 0);
    };

    const handleClose = () => {
        media.filter((item) => item.isNew && item.url).forEach((item) => {
            if (typeof onDeleteMedia === "function") Promise.resolve(onDeleteMedia(item.url)).catch(() => undefined);
        });
        onClose?.();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canSave) {
            setError(!POST_CATEGORIES.includes(category)
                ? "Choose a category for your post."
                : "Complete the required fields before saving.");
            return;
        }

        try {
            await onUpdate(initialData.id, {
                title: title.trim(),
                content: content.trim(),
                category,
                tags,
                media: media
                    .filter((item) => item.status === "done" && item.url)
                    .map((item) => ({ url: item.url, type: item.kind })),
                visibility,
                targetGroupId: visibility === POST_VISIBILITY.SPECIFIC_GROUP && targetGroupId
                    ? Number(targetGroupId)
                    : null,
                isAnonymous,
            });
            onClose?.();
        } catch (requestError) {
            setError(getApiErrorMessage(requestError, "Could not update this post. Please try again."));
        }
    };

    const fieldClass = "input input-bordered h-11 min-h-11 w-full rounded-xl border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20";

    return (
        <Modal
            isOpen={isVisible}
            onClose={loading ? undefined : handleClose}
            title="Edit post"
            description="Update every field, audience and media item. Changes are saved when you submit."
            size="2xl"
            footer={
                <>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
                    <Button type="submit" form="update-post-form" loading={loading} loadingText="Saving…" disabled={!canSave}>
                        Save changes
                    </Button>
                </>
            }
        >
            <form id="update-post-form" onSubmit={handleSubmit} className="space-y-5">
                {error && <Alert variant="error">{error}</Alert>}

                <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-neutral-800">Title (optional)</span>
                    <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={POST_TITLE_MAX_LENGTH} disabled={loading} className={fieldClass} />
                </label>

                <fieldset disabled={loading}>
                    <legend className="mb-1.5 text-sm font-semibold text-neutral-800">Category</legend>
                    <div className="flex flex-wrap gap-2">
                        {POST_CATEGORIES.map((option) => (
                            <label key={option} className="cursor-pointer">
                                <input type="radio" name="edit-category" value={option} checked={category === option} onChange={() => setCategory(option)} className="peer sr-only" />
                                <span className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 transition peer-checked:border-primary-700 peer-checked:bg-primary-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2">
                                    {option}
                                </span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <div>
                    <span className="mb-1.5 block text-sm font-semibold text-neutral-800">Tags <span className="font-normal text-neutral-600">(up to {POST_MAX_TAGS})</span></span>
                    <div className="flex flex-wrap gap-1.5">
                        {POST_TAGS.map((tag) => {
                            const selected = tags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    aria-pressed={selected}
                                    disabled={loading || (!selected && tags.length >= POST_MAX_TAGS)}
                                    onClick={() => toggleTag(tag)}
                                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-40 ${selected ? "border-primary-700 bg-primary-50 text-primary-900" : "border-neutral-300 bg-white text-neutral-700 hover:border-primary-400"}`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-neutral-800">Post content</span>
                        <span className="text-xs text-neutral-600">Markdown supported</span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-neutral-300 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-500/20">
                        <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-2 py-1.5">
                            {toolbar.map(({ key, label, icon: Icon }) => (
                                <button key={key} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertFormat(key)} disabled={loading} aria-label={label} title={label} className="grid h-8 w-8 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50">
                                    <Icon aria-hidden="true" />
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <textarea ref={contentRef} value={content} onChange={(event) => setContent(event.target.value)} maxLength={POST_CONTENT_MAX_LENGTH} rows={7} disabled={loading} className="min-h-36 w-full resize-y border-0 bg-transparent px-3 py-3 pb-8 text-sm leading-6 text-neutral-900 focus:outline-none disabled:bg-neutral-50" />
                            <span className="pointer-events-none absolute bottom-2 right-3 text-xs font-medium text-neutral-500">
                                {content.length.toLocaleString("en-US")} / {POST_CONTENT_MAX_LENGTH.toLocaleString("en-US")}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <span className="mb-1.5 block text-sm font-semibold text-neutral-800">Audience</span>
                    <select value={visibility} onChange={(event) => setVisibility(event.target.value)} disabled={loading} className="select select-bordered h-11 min-h-11 w-full rounded-xl border-neutral-300 bg-white text-sm">
                        {POST_VISIBILITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} disabled={(option.value === POST_VISIBILITY.DOCTORS_ONLY && !canPostDoctorsOnly) || (option.value === POST_VISIBILITY.SPECIFIC_GROUP && groups.length === 0)}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {visibility === POST_VISIBILITY.SPECIFIC_GROUP && (
                        <select value={targetGroupId} onChange={(event) => setTargetGroupId(event.target.value)} disabled={loading || groups.length === 0} className="select select-bordered mt-2 h-11 min-h-11 w-full rounded-xl border-neutral-300 bg-white text-sm">
                            <option value="">Choose a group…</option>
                            {groups.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}
                        </select>
                    )}
                    {visibility === POST_VISIBILITY.SPECIFIC_GROUP && groups.length === 0 && (
                        <p className="mt-1 text-xs text-neutral-600">Join a room first to share with that group.</p>
                    )}
                </div>

                <label className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
                    <span className="min-w-0">
                        <span className="block text-sm font-semibold text-neutral-900">Post anonymously</span>
                        <span className="mt-0.5 block text-xs leading-5 text-neutral-600">Your name and photo stay hidden. Internal ownership is retained for moderation.</span>
                    </span>
                    <input type="checkbox" checked={isAnonymous} onChange={(event) => setAnonymous(event.target.checked)} disabled={loading} className="toggle toggle-primary shrink-0" />
                </label>

                <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-neutral-800">Media</span>
                        <span className="text-xs text-neutral-600">{media.length} item{media.length === 1 ? "" : "s"}</span>
                    </div>
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-center transition hover:border-primary-600 hover:bg-primary/5">
                        <FiImage aria-hidden="true" className="text-xl text-primary-700" />
                        <span className="text-sm font-semibold text-neutral-800">Add images or a short video</span>
                        <span className="text-xs text-neutral-600">Up to 4 images (5 MB each) and 1 video (20 MB)</span>
                        <input ref={mediaInputRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} disabled={loading} className="sr-only" />
                    </label>

                    {media.length > 0 && (
                        <ul aria-label="Post media" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {media.map((item, index) => (
                                <li key={item.id} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                                    {item.kind === "video" ? (
                                        <video src={item.previewUrl} muted playsInline preload="metadata" className="h-24 w-full object-cover" />
                                    ) : (
                                        <img src={item.previewUrl} alt="" className="h-24 w-full object-cover" />
                                    )}
                                    {item.status === "uploading" && (
                                        <div className="absolute inset-x-0 bottom-0 bg-white/95 px-2 pb-1.5 pt-1">
                                            <div role="progressbar" aria-valuenow={item.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Uploading media" className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                                                <div className="h-full bg-primary-700 transition-all" style={{ width: `${item.progress}%` }} />
                                            </div>
                                        </div>
                                    )}
                                    {item.status === "error" && <span className="absolute inset-0 flex items-center justify-center bg-rose-950/70 p-2 text-center text-[11px] font-semibold text-white">{item.error}</span>}
                                    <button type="button" onClick={() => removeMedia(item.id)} disabled={loading} aria-label="Remove media" className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white/95 text-neutral-700 shadow hover:bg-white disabled:opacity-50"><FiX aria-hidden="true" /></button>
                                    <div className="absolute bottom-1 left-1 flex gap-1">
                                        <button type="button" onClick={() => moveMedia(index, -1)} disabled={index === 0 || loading} aria-label="Move media earlier" className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-neutral-700 shadow disabled:opacity-40"><FiArrowLeft aria-hidden="true" /></button>
                                        <button type="button" onClick={() => moveMedia(index, 1)} disabled={index === media.length - 1 || loading} aria-label="Move media later" className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-neutral-700 shadow disabled:opacity-40"><FiArrowRight aria-hidden="true" /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </form>
        </Modal>
    );
};

export default UpdatePostModal;
