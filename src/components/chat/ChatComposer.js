import { useEffect, useRef, useState } from "react";
import { FiMic, FiPaperclip, FiSend, FiSquare, FiTrash2 } from "react-icons/fi";
import { Button } from "../ui";
import { useModerationStage } from "../../hooks/useModerationStage";

const CONTENT_MAX_LENGTH = 2000;
// Mirrors the storage service caps so an oversized pick fails locally before a
// long upload is wasted.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

// Voice notes stop on their own at two minutes, matching the API's cap.
const MAX_RECORDING_MS = 2 * 60 * 1000;

const mediaKind = (file) => {
    // Audio is checked first: a browser voice note can be audio/webm, which
    // shares the .webm extension with video.
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("image/")) return "image";
    return null;
};

const sizeLimitFor = (kind) => {
    if (kind === "video") return MAX_VIDEO_BYTES;
    if (kind === "audio") return MAX_AUDIO_BYTES;
    return MAX_IMAGE_BYTES;
};

const sizeErrorFor = (kind) => {
    if (kind === "video") return "Videos must be smaller than 20 MB.";
    if (kind === "audio") return "Voice messages must be smaller than 10 MB.";
    return "Images must be smaller than 5 MB.";
};

const formatDuration = (milliseconds) => {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const recordingExtension = (mimeType) => {
    const type = (mimeType || "").toLowerCase();
    if (type.includes("ogg")) return "ogg";
    if (type.includes("mp4")) return "m4a";
    return "webm";
};

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
 *
 * Voice notes are recorded with MediaRecorder and stop automatically at two
 * minutes. The resulting clip is uploaded through the same media endpoint as
 * an audio attachment.
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
    const [isRecording, setIsRecording] = useState(false);
    const [recordedMs, setRecordedMs] = useState(0);
    const [recordingError, setRecordingError] = useState(null);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const previewUrlRef = useRef(null);
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const autoStopRef = useRef(null);
    const discardRecordingRef = useRef(false);
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;
    const stage = useModerationStage(isSending);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };

    const clearRecordingClock = () => {
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        if (autoStopRef.current) {
            clearTimeout(autoStopRef.current);
            autoStopRef.current = null;
        }
    };

    const clearAttachment = () => {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
        }
        setAttachment(null);
        setUpload({ state: "idle", progress: 0, result: null, error: null });
    };

    /**
     * Upload one accepted file and keep its local preview on screen until the
     * attachment is cleared or the send succeeds.
     */
    const beginUpload = async (file, kind) => {
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

    const cancelRecording = () => {
        discardRecordingRef.current = true;
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
        } else {
            clearRecordingClock();
            stopStream();
            setIsRecording(false);
            setRecordedMs(0);
        }
    };

    // Drop the draft, any in-flight preview and an active recording when the
    // room becomes read-only.
    useEffect(() => {
        if (disabled) {
            setContent("");
            clearAttachment();
            cancelRecording();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disabled]);

    // Revoke the object URL and release the microphone if the composer
    // unmounts mid-preview or mid-recording.
    useEffect(() => () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        clearRecordingClock();
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.onstop = null;
            recorderRef.current.stop();
        }
        stopStream();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        !uploadFailed &&
        !isRecording;

    const handleFileSelected = async (event) => {
        const file = event.target.files && event.target.files[0];
        // Allow re-picking the same file after a removal.
        event.target.value = "";
        if (!file) return;

        const kind = mediaKind(file);
        if (!kind) {
            setUpload({ state: "error", progress: 0, result: null, error: "Choose an image, video or audio file." });
            return;
        }

        if (file.size > sizeLimitFor(kind)) {
            setUpload({ state: "error", progress: 0, result: null, error: sizeErrorFor(kind) });
            return;
        }

        await beginUpload(file, kind);
    };

    const startRecording = async () => {
        if (isRecording || uploading || isSending) return;

        setRecordingError(null);

        if (
            typeof navigator === "undefined" ||
            !navigator.mediaDevices?.getUserMedia ||
            typeof window === "undefined" ||
            typeof window.MediaRecorder === "undefined"
        ) {
            setRecordingError("Voice recording is not supported in this browser.");
            return;
        }

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            setRecordingError(
                error?.name === "NotAllowedError" || error?.name === "SecurityError"
                    ? "Microphone access was denied. Allow it in your browser settings to record a voice message."
                    : "Could not start recording. Check that a microphone is available and try again.",
            );
            return;
        }

        // The room may have become read-only while the permission prompt was
        // open. Do not keep the microphone on in that case.
        if (disabledRef.current) {
            stream.getTracks().forEach((track) => track.stop());
            return;
        }

        const recorder = new window.MediaRecorder(stream);
        chunksRef.current = [];
        discardRecordingRef.current = false;

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            clearRecordingClock();
            stopStream();
            recorderRef.current = null;
            setIsRecording(false);
            setRecordedMs(0);

            if (discardRecordingRef.current) {
                discardRecordingRef.current = false;
                chunksRef.current = [];
                return;
            }

            const mimeType = recorder.mimeType || "audio/webm";
            const blob = new Blob(chunksRef.current, { type: mimeType });
            chunksRef.current = [];

            if (!blob.size) {
                setRecordingError("The recording was empty. Try again.");
                return;
            }

            if (blob.size > MAX_AUDIO_BYTES) {
                setRecordingError(sizeErrorFor("audio"));
                return;
            }

            const file = new File(
                [blob],
                `voice-message.${recordingExtension(mimeType)}`,
                { type: mimeType },
            );

            beginUpload(file, "audio");
        };

        recorderRef.current = recorder;
        streamRef.current = stream;
        recorder.start();
        setIsRecording(true);
        setRecordedMs(0);

        const startedAt = Date.now();
        recordingTimerRef.current = setInterval(() => {
            setRecordedMs(Date.now() - startedAt);
        }, 250);

        autoStopRef.current = setTimeout(() => {
            const active = recorderRef.current;
            if (active && active.state !== "inactive") {
                active.stop();
            }
        }, MAX_RECORDING_MS);
    };

    const stopRecording = () => {
        discardRecordingRef.current = false;
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") {
            recorder.stop();
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
            {isRecording && (
                <div
                    className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-error/30 bg-error/5 p-2"
                    role="status"
                    aria-live="polite"
                >
                    <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-error" aria-hidden="true" />
                    <span className="text-xs font-semibold text-neutral-800">
                        Recording… {formatDuration(recordedMs)} / 02:00
                    </span>
                    <button
                        type="button"
                        onClick={stopRecording}
                        className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-error/40 px-2.5 text-xs font-semibold text-error transition hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                    >
                        <FiSquare aria-hidden="true" />
                        Stop
                    </button>
                </div>
            )}

            {attachment && (
                <div className="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                    {attachment.kind === "audio" ? (
                        <audio
                            src={attachment.previewUrl}
                            controls
                            aria-label="Voice message preview"
                            className="h-12 w-full shrink-0 sm:max-w-64"
                        />
                    ) : attachment.kind === "video" ? (
                        <video
                            src={attachment.previewUrl}
                            controls
                            muted
                            playsInline
                            aria-label="Video attachment preview"
                            className="h-14 w-20 shrink-0 rounded-lg bg-black object-cover"
                        />
                    ) : (
                        <img
                            src={attachment.previewUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                    )}
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

            {recordingError && (
                <p className="mb-2 text-xs font-medium text-error" role="status">{recordingError}</p>
            )}

            <div className="flex items-end gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileSelected}
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Attach a photo, video or audio file"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || isRecording}
                    aria-label="Attach a photo, video or audio file"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-300 text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FiPaperclip aria-hidden="true" className="text-lg" />
                </button>
                <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={uploading || isSending || Boolean(attachment)}
                    aria-label={isRecording ? "Stop recording" : "Record a voice message"}
                    aria-pressed={isRecording}
                    title={isRecording ? "Stop recording" : "Record a voice message"}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isRecording
                            ? "border-error/40 bg-error/10 text-error"
                            : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                    }`}
                >
                    {isRecording ? <FiSquare aria-hidden="true" className="text-lg" /> : <FiMic aria-hidden="true" className="text-lg" />}
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
                        disabled={isSending || isRecording}
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
