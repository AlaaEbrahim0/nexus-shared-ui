import { useRef, useState } from "react";
import { FiPaperclip, FiX } from "react-icons/fi";
import { getApiErrorMessage } from "../../api/client";
import { getMediaKind, mediaFileError } from "../../utils/postComposerConfig";

/**
 * A single image/video attachment for a comment or reply.
 *
 * The file is uploaded as soon as it is picked, through the community media
 * endpoint, and the parent only receives the resulting `{ url, type }`. That
 * keeps the comment POST small and makes the attachment visible as soon as the
 * upload completes. Comment/reply media is immutable after creation, so the
 * parent never has to send a replacement.
 */
export const AttachmentPicker = ({
    value = null,
    onChange,
    upload,
    removeUpload,
    disabled = false,
    className = "",
}) => {
    const [state, setState] = useState({ status: "idle", progress: 0, error: "" });
    const inputRef = useRef(null);

    const isUploading = state.status === "uploading";

    const handleFile = async (event) => {
        const file = event.target.files && event.target.files[0];
        // Allow re-picking the same file after a removal.
        event.target.value = "";
        if (!file) return;

        const kind = getMediaKind(file);
        const validationError = mediaFileError(file);
        if (validationError || !kind) {
            setState({
                status: "error",
                progress: 0,
                error: validationError || "Choose an image or video file.",
            });
            return;
        }

        if (typeof upload !== "function") {
            setState({
                status: "error",
                progress: 0,
                error: "Uploads are unavailable right now.",
            });
            return;
        }

        setState({ status: "uploading", progress: 0, error: "" });

        try {
            const result = await upload(file, (percent) => {
                setState((previous) =>
                    previous.status === "uploading"
                        ? { ...previous, progress: percent }
                        : previous
                );
            });

            if (!result?.url) {
                throw new Error("The upload did not return a URL.");
            }

            onChange?.({
                url: result.url,
                type: result.type === "video" ? "video" : kind,
            });
            setState({ status: "idle", progress: 0, error: "" });
        } catch (error) {
            setState({
                status: "error",
                progress: 0,
                error: getApiErrorMessage(
                    error,
                    "The upload failed. Please try again."
                ),
            });
        }
    };

    const handleRemove = () => {
        const url = value?.url;
        onChange?.(null);
        setState({ status: "idle", progress: 0, error: "" });

        if (url && typeof removeUpload === "function") {
            // Best effort: an orphaned asset is harmless and the API cleans
            // unattached media up later.
            Promise.resolve(removeUpload(url)).catch(() => undefined);
        }
    };

    return (
        <div className={`flex min-w-0 flex-wrap items-center gap-2 ${className}`}>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={handleFile}
                disabled={disabled || isUploading}
                tabIndex={-1}
                aria-label="Attach an image or video"
                className="sr-only"
            />

            {!value && (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled || isUploading}
                    aria-label="Attach an image or video"
                    title="Attach an image or video"
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 px-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FiPaperclip aria-hidden="true" />
                    {isUploading ? `${state.progress}%` : "Attach"}
                </button>
            )}

            {value && (
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-1 pr-1.5">
                    {value.type === "video" ? (
                        <video
                            src={value.url}
                            muted
                            playsInline
                            preload="metadata"
                            aria-label="Attached video preview"
                            className="h-9 w-12 shrink-0 rounded-md bg-black object-cover"
                        />
                    ) : (
                        <img
                            src={value.url}
                            alt="Attached media preview"
                            className="h-9 w-12 shrink-0 rounded-md object-cover"
                        />
                    )}
                    <span className="max-w-32 truncate text-xs font-medium text-neutral-700">
                        {value.type === "video" ? "Video attached" : "Image attached"}
                    </span>
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={disabled}
                        aria-label="Remove attachment"
                        title="Remove attachment"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <FiX aria-hidden="true" />
                    </button>
                </div>
            )}

            {isUploading && (
                <span
                    role="progressbar"
                    aria-label="Uploading attachment"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={state.progress}
                    className="inline-flex min-w-24 items-center gap-2 text-xs font-medium text-neutral-600"
                >
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200">
                        <span
                            className="block h-full rounded-full bg-primary-700 transition-all"
                            style={{ width: `${state.progress}%` }}
                        />
                    </span>
                    Uploading… {state.progress}%
                </span>
            )}

            {state.status === "error" && state.error && (
                <span role="status" className="text-xs font-medium text-error">
                    {state.error}
                </span>
            )}
        </div>
    );
};
