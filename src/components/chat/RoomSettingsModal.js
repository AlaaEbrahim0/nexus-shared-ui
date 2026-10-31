import { useEffect, useRef, useState } from "react";
import { FiHash, FiImage, FiLock, FiTrash2 } from "react-icons/fi";
import { Alert, Button, Modal } from "../ui";
import { getApiErrorMessage } from "../../api/client";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const PASSPHRASE_MIN_LENGTH = 8;
const PASSPHRASE_MAX_LENGTH = 128;
const COVER_MAX_BYTES = 5 * 1024 * 1024;

const toIsoUtc = (localValue) => {
    if (!localValue) return null;
    const parsed = new Date(localValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toLocalInputValue = (utcValue) => {
    if (!utcValue) return "";
    const date = new Date(utcValue);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const validatePassphrase = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "Enter a room password.";
    if (
        trimmed.length < PASSPHRASE_MIN_LENGTH ||
        trimmed.length > PASSPHRASE_MAX_LENGTH
    ) {
        return `A room password must be ${PASSPHRASE_MIN_LENGTH} to ${PASSPHRASE_MAX_LENGTH} characters.`;
    }
    if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
        return "The room password cannot contain control characters.";
    }
    return null;
};

/**
 * Owner/moderator settings for an existing room. Every operation maps to an
 * existing chat endpoint; the server remains the authorization boundary.
 */
export const RoomSettingsModal = ({
    isOpen,
    room,
    onClose,
    onRoomUpdated,
    updateDetails,
    updatePrivacy,
    setPassphrase,
    clearPassphrase,
    updateSchedule,
    uploadCover,
    removeCover,
}) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState("Public");
    const [passphrase, setNewPassphrase] = useState("");
    const [confirmPassphrase, setConfirmPassphrase] = useState("");
    const [scheduledStart, setScheduledStart] = useState("");
    const [cover, setCover] = useState(null);
    const [confirmRemovePassphrase, setConfirmRemovePassphrase] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState("");
    const coverInputRef = useRef(null);

    useEffect(() => {
        if (!isOpen || !room) return;

        setName(room.name || "");
        setDescription(room.description || "");
        setVisibility(room.isPrivate ? "Private" : "Public");
        setNewPassphrase("");
        setConfirmPassphrase("");
        setScheduledStart(toLocalInputValue(room.scheduledStartAtUtc));
        setCover(null);
        setConfirmRemovePassphrase(false);
        setError("");
        setStatus("");
        setBusy("");
        if (coverInputRef.current) coverInputRef.current.value = "";
    }, [isOpen, room?.id]);

    const run = async (label, action, successMessage) => {
        setBusy(label);
        setError("");
        setStatus("");
        try {
            const updated = await action();
            if (updated) {
                onRoomUpdated?.(updated);
            }
            setStatus(successMessage);
            return updated;
        } catch (requestError) {
            setError(
                getApiErrorMessage(
                    requestError,
                    "The room settings could not be updated."
                )
            );
            return null;
        } finally {
            setBusy("");
        }
    };

    const saveDetails = async (event) => {
        event.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Give the room a name.");
            return;
        }
        await run(
            "details",
            () => updateDetails({ name: trimmedName, description: description.trim() }),
            "Room details saved."
        );
    };

    const savePrivacy = async (nextVisibility) => {
        setVisibility(nextVisibility);
        await run(
            "privacy",
            () => updatePrivacy(nextVisibility),
            nextVisibility === "Public"
                ? "The room is public now. Any room password was removed."
                : "The room is private now."
        );
    };

    const savePassphrase = async (event) => {
        event.preventDefault();
        const passphraseError = validatePassphrase(passphrase);
        if (passphraseError) {
            setError(passphraseError);
            return;
        }
        if (passphrase.trim() !== confirmPassphrase.trim()) {
            setError("The room passwords do not match.");
            return;
        }
        const updated = await run(
            "passphrase",
            () => setPassphrase(passphrase.trim()),
            "Room password updated. Only people with the new password can join."
        );
        if (updated) {
            setNewPassphrase("");
            setConfirmPassphrase("");
            setConfirmRemovePassphrase(false);
        }
    };

    const removeRoomPassphrase = async () => {
        const updated = await run(
            "remove-passphrase",
            clearPassphrase,
            "Room password removed. The room can be joined without one."
        );
        if (updated) {
            setConfirmRemovePassphrase(false);
            setNewPassphrase("");
            setConfirmPassphrase("");
        }
    };

    const saveSchedule = async (event) => {
        event.preventDefault();
        const scheduledStartAtUtc = toIsoUtc(scheduledStart);
        if (scheduledStart && (!scheduledStartAtUtc || new Date(scheduledStartAtUtc) <= new Date())) {
            setError("Pick a start time in the future.");
            return;
        }
        await run(
            "schedule",
            () => updateSchedule(scheduledStartAtUtc),
            scheduledStart ? "Scheduled start saved." : "Scheduled start cleared."
        );
    };

    const chooseCover = (event) => {
        const file = event.target.files?.[0] || null;
        if (file && file.size > COVER_MAX_BYTES) {
            setError("The cover image must be under 5 MB.");
            event.target.value = "";
            setCover(null);
            return;
        }
        setError("");
        setCover(file);
    };

    const saveCover = async () => {
        if (!cover) return;
        const updated = await run(
            "cover",
            () => uploadCover(cover),
            "Room cover updated."
        );
        if (updated) {
            setCover(null);
            if (coverInputRef.current) coverInputRef.current.value = "";
        }
    };

    const clearCover = async () => {
        await run("cover-remove", removeCover, "Room cover removed.");
    };

    if (!room) return null;

    const labelClass = "mb-1.5 block text-sm font-semibold text-neutral-800";
    const fieldClass =
        "input input-bordered h-11 min-h-11 w-full rounded-xl border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20";
    const textareaClass =
        "textarea textarea-bordered min-h-24 w-full rounded-xl border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-500/20";

    return (
        <Modal
            isOpen={isOpen}
            onClose={busy ? undefined : onClose}
            title="Room settings"
            description="Manage this room. Changes are announced to members in real time."
            size="2xl"
        >
            <div className="space-y-6">
                {error && <Alert variant="error">{error}</Alert>}
                {status && <Alert variant="success">{status}</Alert>}

                <form onSubmit={saveDetails} className="space-y-3">
                    <label className="block">
                        <span className={labelClass}>Room name</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={NAME_MAX_LENGTH}
                            disabled={busy === "details"}
                            className={fieldClass}
                        />
                    </label>
                    <label className="block">
                        <span className={labelClass}>Description</span>
                        <textarea
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            maxLength={DESCRIPTION_MAX_LENGTH}
                            rows={3}
                            disabled={busy === "details"}
                            className={textareaClass}
                        />
                    </label>
                    <div className="flex justify-end">
                        <Button type="submit" size="sm" loading={busy === "details"} loadingText="Saving…">
                            Save details
                        </Button>
                    </div>
                </form>

                <section className="space-y-3 border-t border-neutral-200 pt-5">
                    <h3 className="text-sm font-bold text-neutral-900">Privacy</h3>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Room privacy">
                        {["Public", "Private"].map((value) => (
                            <Button
                                key={value}
                                type="button"
                                size="sm"
                                variant={visibility === value ? "primary" : "outline"}
                                aria-pressed={visibility === value}
                                disabled={busy === "privacy"}
                                onClick={() => savePrivacy(value)}
                            >
                                {value}
                            </Button>
                        ))}
                    </div>
                    <p className="text-xs leading-5 text-neutral-600">
                        A private room is visible in the directory but its description and
                        conversation are member-only. Making a room public removes any room
                        password.
                    </p>
                </section>

                <section className="space-y-3 border-t border-neutral-200 pt-5">
                    <div className="flex items-center gap-2">
                        <FiLock aria-hidden="true" className="text-primary-700" />
                        <h3 className="text-sm font-bold text-neutral-900">Room password</h3>
                    </div>
                    <p className="text-xs leading-5 text-neutral-600">
                        {room.requiresPassword
                            ? "A password is currently required to join this room."
                            : "No password is set. Anyone who can see the room can join."}
                    </p>
                    <form onSubmit={savePassphrase} className="space-y-3">
                        <label className="block">
                            <span className={labelClass}>
                                {room.requiresPassword ? "New password" : "Set a password"}
                            </span>
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={passphrase}
                                onChange={(event) => setNewPassphrase(event.target.value)}
                                placeholder={`${PASSPHRASE_MIN_LENGTH}–${PASSPHRASE_MAX_LENGTH} characters`}
                                disabled={busy === "passphrase"}
                                className={fieldClass}
                            />
                        </label>
                        <label className="block">
                            <span className={labelClass}>Confirm password</span>
                            <input
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassphrase}
                                onChange={(event) => setConfirmPassphrase(event.target.value)}
                                disabled={busy === "passphrase"}
                                className={fieldClass}
                            />
                        </label>
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                type="submit"
                                size="sm"
                                loading={busy === "passphrase"}
                                loadingText="Updating…"
                                disabled={!passphrase}
                            >
                                <FiHash aria-hidden="true" />
                                {room.requiresPassword ? "Update password" : "Set password"}
                            </Button>
                            {room.requiresPassword && !confirmRemovePassphrase && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy === "remove-passphrase"}
                                    onClick={() => setConfirmRemovePassphrase(true)}
                                >
                                    <FiTrash2 aria-hidden="true" /> Remove password
                                </Button>
                            )}
                        </div>
                    </form>
                    {confirmRemovePassphrase && room.requiresPassword && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                            <p className="text-sm font-semibold text-rose-900">
                                Remove the room password?
                            </p>
                            <p className="mt-1 text-xs leading-5 text-rose-800">
                                Anyone who can see the room will be able to join without a
                                password. This cannot be undone automatically.
                            </p>
                            <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setConfirmRemovePassphrase(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    loading={busy === "remove-passphrase"}
                                    loadingText="Removing…"
                                    onClick={removeRoomPassphrase}
                                >
                                    Remove password
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                <section className="space-y-3 border-t border-neutral-200 pt-5">
                    <h3 className="text-sm font-bold text-neutral-900">Scheduled start</h3>
                    <form onSubmit={saveSchedule} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <label className="block flex-1">
                            <span className={labelClass}>Date and time</span>
                            <input
                                type="datetime-local"
                                value={scheduledStart}
                                onChange={(event) => setScheduledStart(event.target.value)}
                                disabled={busy === "schedule"}
                                className={fieldClass}
                            />
                        </label>
                        <Button type="submit" size="sm" variant="outline" loading={busy === "schedule"} loadingText="Saving…">
                            Save schedule
                        </Button>
                    </form>
                    <p className="text-xs leading-5 text-neutral-600">
                        Leave empty and save to clear the scheduled start.
                    </p>
                </section>

                <section className="space-y-3 border-t border-neutral-200 pt-5">
                    <div className="flex items-center gap-2">
                        <FiImage aria-hidden="true" className="text-primary-700" />
                        <h3 className="text-sm font-bold text-neutral-900">Cover image</h3>
                    </div>
                    {room.coverImageUrl && (
                        <img
                            src={room.coverImageUrl}
                            alt="Current room cover"
                            className="max-h-40 w-full rounded-xl border border-neutral-200 object-cover"
                        />
                    )}
                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={chooseCover}
                        disabled={busy === "cover"}
                        className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" onClick={saveCover} disabled={!cover} loading={busy === "cover"} loadingText="Uploading…">
                            Upload cover
                        </Button>
                        {room.coverImageUrl && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={clearCover}
                                loading={busy === "cover-remove"}
                                loadingText="Removing…"
                            >
                                Remove cover
                            </Button>
                        )}
                    </div>
                </section>
            </div>
        </Modal>
    );
};
