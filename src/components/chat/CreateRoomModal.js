import { useEffect, useRef, useState } from "react";
import { FiHash, FiImage, FiLock } from "react-icons/fi";
import toast from "react-hot-toast";
import { Button, Input, Modal, Select, Textarea } from "../ui";
import {
    getChatErrorMessage,
    uploadChatRoomCover,
    useCreateChatRoom,
} from "../../api/chat.api";

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

/**
 * Create a chat room.
 *
 * The create endpoint is JSON; the cover is a separate multipart upload that
 * runs after the room exists, so a failed upload leaves a working room behind
 * and only warns. A passphrase always makes the room private, on the server
 * and in this form.
 */
export const CreateRoomModal = ({ isOpen, onClose, onCreated }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState("Public");
    const [passphrase, setPassphrase] = useState("");
    const [scheduledStart, setScheduledStart] = useState("");
    const [cover, setCover] = useState(null);
    const [formError, setFormError] = useState(null);
    const nameRef = useRef(null);
    const coverInputRef = useRef(null);

    const { isLoading, execute } = useCreateChatRoom();

    useEffect(() => {
        if (isOpen) {
            setName("");
            setDescription("");
            setVisibility("Public");
            setPassphrase("");
            setScheduledStart("");
            setCover(null);
            setFormError(null);
            if (coverInputRef.current) coverInputRef.current.value = "";
        }
    }, [isOpen]);

    const handleCoverChange = (event) => {
        const file = event.target.files?.[0] || null;

        if (file && file.size > COVER_MAX_BYTES) {
            setFormError("The cover image must be under 5 MB.");
            event.target.value = "";
            setCover(null);
            return;
        }

        setFormError(null);
        setCover(file);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedName = name.trim();
        if (!trimmedName) {
            setFormError("Give the room a name.");
            return;
        }

        const trimmedPassphrase = passphrase.trim();
        if (trimmedPassphrase && (
            trimmedPassphrase.length < PASSPHRASE_MIN_LENGTH ||
            trimmedPassphrase.length > PASSPHRASE_MAX_LENGTH
        )) {
            setFormError(`A room password must be ${PASSPHRASE_MIN_LENGTH} to ${PASSPHRASE_MAX_LENGTH} characters.`);
            return;
        }

        const scheduledStartAtUtc = toIsoUtc(scheduledStart);
        if (scheduledStart && (!scheduledStartAtUtc || new Date(scheduledStartAtUtc) <= new Date())) {
            setFormError("The scheduled start must be in the future.");
            return;
        }

        setFormError(null);

        try {
            const room = await execute({
                name: trimmedName,
                description: description.trim(),
                visibility: trimmedPassphrase ? "Private" : visibility,
                passphrase: trimmedPassphrase || null,
                scheduledStartAtUtc,
            });

            if (cover) {
                try {
                    await uploadChatRoomCover(room.id, cover);
                } catch {
                    toast.error("The room was created, but its cover could not be uploaded.");
                }
            }

            onCreated?.(room);
            onClose?.();
        } catch (error) {
            setFormError(getChatErrorMessage(error, "The room could not be created."));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={isLoading ? undefined : onClose}
            title="Create a chat room"
            description="Public rooms are listed for everyone; the conversation is visible only to members."
            size="md"
            initialFocusRef={nameRef}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} loading={isLoading} loadingText="Creating…">
                        Create room
                    </Button>
                </>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Input
                    id="chat-room-name"
                    ref={nameRef}
                    label="Room name"
                    required
                    error={formError && !name.trim() ? formError : null}
                    hint={`${name.length}/${NAME_MAX_LENGTH} characters`}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={NAME_MAX_LENGTH}
                    placeholder="Anxiety support"
                    disabled={isLoading}
                    autoComplete="off"
                />

                <Textarea
                    id="chat-room-description"
                    label="Description"
                    hint={`${description.length}/${DESCRIPTION_MAX_LENGTH} characters`}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    rows={3}
                    placeholder="What is this room for?"
                    disabled={isLoading}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select
                        id="chat-room-visibility"
                        label="Visibility"
                        value={visibility}
                        onChange={(event) => {
                            setVisibility(event.target.value);
                            if (event.target.value === "Public") setPassphrase("");
                        }}
                        disabled={isLoading}
                        hint="Passwords apply to private rooms."
                    >
                        <option value="Public">Public</option>
                        <option value="Private">Private</option>
                    </Select>

                    <Input
                        id="chat-room-scheduled"
                        label="Scheduled start"
                        type="datetime-local"
                        value={scheduledStart}
                        onChange={(event) => setScheduledStart(event.target.value)}
                        disabled={isLoading}
                        hint="Optional, up to 90 days ahead."
                    />
                </div>

                <Input
                    id="chat-room-passphrase"
                    label="Room password"
                    type="password"
                    autoComplete="new-password"
                    value={passphrase}
                    onChange={(event) => {
                        setPassphrase(event.target.value);
                        if (event.target.value) setVisibility("Private");
                    }}
                    minLength={PASSPHRASE_MIN_LENGTH}
                    maxLength={PASSPHRASE_MAX_LENGTH}
                    placeholder="Optional: 8+ characters"
                    disabled={isLoading}
                    hint="Use a password to restrict joining; it is hashed, never stored in plain text."
                />

                <div>
                    <span className="mb-1.5 block text-sm font-semibold text-neutral-800">
                        Cover image
                    </span>
                    <input
                        ref={coverInputRef}
                        id="chat-room-cover"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleCoverChange}
                        disabled={isLoading}
                    />
                    <label
                        htmlFor="chat-room-cover"
                        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-primary-800 transition hover:border-primary-700 hover:bg-primary-50 focus-within:ring-2 focus-within:ring-primary-700/30"
                    >
                        <FiImage aria-hidden="true" className="text-xl" />
                        <span className="truncate">
                            {cover ? cover.name : "Choose an image (optional)"}
                        </span>
                    </label>
                    {cover && (
                        <button
                            type="button"
                            onClick={() => {
                                setCover(null);
                                if (coverInputRef.current) coverInputRef.current.value = "";
                            }}
                            className="mt-1 text-xs font-semibold text-neutral-600 underline"
                        >
                            Remove image
                        </button>
                    )}
                </div>

                {formError && name.trim() && (
                    <p role="alert" className="text-sm font-medium text-error">
                        {formError}
                    </p>
                )}

                <p className="flex items-start gap-2 rounded-xl bg-neutral-50 p-3 text-xs leading-5 text-neutral-600">
                    {passphrase ? (
                        <FiLock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                    ) : (
                        <FiHash aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                    )}
                    <span>
                        You become the room owner. Owners moderate reports, assign
                        moderator roles, pause the room, and archive it when it is done.
                    </span>
                </p>

                <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
};
