import { useEffect, useRef, useState } from "react";
import { FiLock } from "react-icons/fi";
import { Alert, Button, Input, Modal } from "../ui/primitives";

/**
 * Confirms joining a room and collects its passphrase when one is required.
 *
 * The caller owns the API call: `onSubmit(passphrase)` should return a promise
 * and throw on failure, so the message here can use the portal's own error
 * mapping.
 */
export const JoinRoomModal = ({ isOpen, room, onClose, onJoined, onSubmit }) => {
    const [passphrase, setPassphrase] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    const requiresPassphrase = Boolean(room?.requiresPassword);

    useEffect(() => {
        if (isOpen) {
            setPassphrase("");
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    const handleSubmit = async (event) => {
        event?.preventDefault?.();

        if (requiresPassphrase && !passphrase.trim()) {
            setError("Enter the room password to join.");
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const member = await onSubmit?.(passphrase.trim() || null);
            onJoined?.(member, room);
            onClose?.();
        } catch (submitError) {
            setError(
                submitError?.friendlyMessage ||
                submitError?.response?.data?.detail ||
                submitError?.message ||
                "The room could not be joined."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={loading ? undefined : onClose}
            title={`Join ${room?.name || "room"}`}
            description={
                room?.ownerDisplayName
                    ? `Hosted by ${room.ownerDisplayName} · ${room.memberCount || 0} members`
                    : undefined
            }
            initialFocusRef={requiresPassphrase ? inputRef : undefined}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={loading}
                        loadingText="Joining…"
                    >
                        {requiresPassphrase ? <FiLock aria-hidden="true" /> : null}
                        Join room
                    </Button>
                </>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {requiresPassphrase ? (
                    <Input
                        id="room-passphrase"
                        ref={inputRef}
                        label="Room password"
                        type="password"
                        autoComplete="off"
                        value={passphrase}
                        onChange={(event) => setPassphrase(event.target.value)}
                        disabled={loading}
                        placeholder="Enter the password shared by the host"
                    />
                ) : (
                    <p className="text-sm leading-6 text-neutral-600">
                        Join this room to read its conversation and take part.
                    </p>
                )}

                {error && (
                    <Alert variant="error" role="alert">
                        {error}
                    </Alert>
                )}

                <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
};
