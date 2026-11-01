import { useEffect, useRef, useState } from "react";
import { FiPaperclip, FiSend, FiTrash2 } from "react-icons/fi";
import { Button } from "../ui";
import { useModerationStage } from "../../hooks/useModerationStage";

const CONTENT_MAX_LENGTH = 2000;
// Mirrors the storage service caps so an oversized pick fails locally before a
// long upload is wasted.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const mediaKind = (file) => {
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("image/")) return "image";
    return null;
};

const sizeLimitFor = (kind) => (kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES);

/**
 * The message composer.
 *
 * Enter sends, Shift+Enter inserts a newline. The send button is disabled
 * while the message is empty (and has no attached media), while a send is in
 * flight, while an upload is running, and when the room is archived.
 *
 * Media is uploaded the moment it is picked, through the room's media endpoint,
 * so the composer can show real progress and the send itself only references the
 * returned URL. The draft and attachment stay on screen until a send succeeds,
 * so a failed send is retryable without losing anything.
 */
export const ChatComposer = ({
    onSend,
    uploadMedia,
    disabled = false,
    disabledReason = null,
    isSending = false,
    placeholder = "Write a message…",
}) => {
    const [content, setContent] = useState("");
    const [attachment, setAttachment] = useState(null);
    const [upload, setUpload] = useState({ state: "idle", progress: 0, result: null, error: null });
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const previewUrlRef = useRef(null);
    const stage = useModerationStage(isSending);

    const clearAttachment = () => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setAttachment(null);
        setUpload({ state: "idle", progress: 0, result: null, error: null });
    };

    // Drop the draft and any in-flight preview when the room becomes read-only.
    useEffect(() => {
        if (disabled) {
            setContent("");
            clearAttachment();
        }
    }, [disabled]);

    // Revoke the object URL if the composer unmounts mid-preview.
    useEffect(() => () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    }, []);

    const trimmed = content.trim();
    const uploading = upload.state === "uploading";
    const uploadFailed = upload.state === "error";
    const hasMedia = Boolean(upload.result);
    const canSend =
        (Boolean(trimmed) || hasMedia) &&
        !disabled &&
        !isSending &&
        !uploading &&
        !uploadFailed;

    const handleFileSelected = async (event) => {
        const file = event.target.files && event.target.files[0];
        // Allow re-picking the same file after a removal.
        event.target.value = "";
        if (!file) return;

        const kind = mediaKind(file);
        if (!kind) {
            setUpload({ state: "error", progress: 0, result: null, error: "Choose an image or a video file." });
            return;
        }

        if (file.size > sizeLimitFor(kind)) {
            const limitMb = Math.round(sizeLimitFor(kind) / (1024 * 1024));
            setUpload({ state: "error", progress: 0, result: null, error: `${kind === "video" ? "Videos" : "Images"} must be smaller than ${limitMb} MB.` });
            return;
        }

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const previewUrl = URL.createObjectURL(file);
        previewUrlRef.current = previewUrl;
        setAttachment({ name: file.name, kind, previewUrl });
        setUpload({ state: "uploading", progress: 0, result: null, error: null });

        try {
            const result = await uploadMedia(file, (percent) => setUpload((previous) => (
                previous.state === "uploading" ? { ...previous, progress: percent } : previous
            )));
            setUpload({ state: "done", progress: 100, result: { url: result.url, type: result.type || kind }, error: null });
        } catch {
            setUpload({ state: "error", progress: 0, result: null, error: "The upload failed. Remove it and try again." });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!canSend) return;

        const value = trimmed;
        const media = upload.result ? { url: upload.result.url, type: upload.result.type } : null;

        try {
            await onSend?.(value, media);
            setContent("");
            clearAttachment();
        } catch {
            // The caller owns the error feedback; keep the draft and attachment
            // so the send can be retried without losing anything.
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event);
        }
    };

    if (disabled) {
        return (
            <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                {disabledReason || "This room is read-only."}
            </div>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="border-t border-neutral-200 bg-base-100 px-4 py-3"
        >
            {attachment && (
                <div className="mb-2 flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                    <img
                        src={attachment.previewUrl}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-neutral-800">{attachment.name}</p>
                        {upload.state === "uploading" && (
                            <div className="mt-1.5" role="progressbar" aria-valuenow={upload.progress} aria-valuemin={0} aria-valuemax={100}>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                                    <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${upload.progress}%` }} />
                                </div>
                                <p className="mt-1 text-[11px] text-neutral-500">Uploading… {upload.progress}%</p>
                            </div>
                        )}
                        {upload.state === "done" && (
                            <p className="mt-1 text-[11px] font-medium text-emerald-700">Ready to send.</p>
                        )}
                        {uploadFailed && (
                            <p className="mt-1 text-[11px] font-medium text-error">{upload.error}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={clearAttachment}
                        aria-label="Remove attachment"
                        className="shrink-0 rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                    >
                        <FiTrash2 aria-hidden="true" />
                    </button>
                </div>
            )}

            {!attachment && uploadFailed && upload.error && (
                <p className="mb-2 text-xs font-medium text-error" role="status">{upload.error}</p>
            )}

            <div className="flex items-end gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelected}
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Attach a photo or video"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Attach a photo or video"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-300 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FiPaperclip aria-hidden="true" className="text-lg" />
                </button>
                <label className="min-w-0 flex-1">
                    <span className="sr-only">Message</span>
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        maxLength={CONTENT_MAX_LENGTH}
                        placeholder={placeholder}
                        disabled={isSending}
                        className="w-full resize-none rounded-xl border border-neutral-300 bg-base-100 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:cursor-not-allowed disabled:bg-neutral-50"
                    />
                </label>
                <Button
                    type="submit"
                    disabled={!canSend}
                    loading={isSending}
                    aria-label="Send message"
                >
                    <FiSend aria-hidden="true" />
                    <span className="hidden sm:inline">{isSending ? "Checking…" : "Send"}</span>
                </Button>
            </div>
            {stage && (
                <p role="status" aria-live="polite" className="mt-2 text-sm text-neutral-700">
                    <span className="font-semibold">{stage.label}</span>
                    {stage.detail && <span className="mt-0.5 block text-xs text-neutral-600">{stage.detail}</span>}
                </p>
            )}
            <p className="mt-1.5 text-xs text-neutral-500">
                Messages are visible to everyone in this room. Do not share personal
                health information.
            </p>
        </form>
    );
};
