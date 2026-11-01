import { useEffect, useRef, useState } from "react";
import { FiFlag } from "react-icons/fi";
import { Button, Modal, Textarea } from "../ui";
import { useReportChatMessage } from "../../api/chat.api";
import { getChatErrorMessage } from "../../api/chat.api";

const REASON_MAX_LENGTH = 1000;

/**
 * Report a message to the room moderators.
 *
 * The reporter's identity is never exposed to the moderators, and a sender
 * cannot report their own message. The server rejects a duplicate report
 * with 409 Chat.ReportAlreadyExists.
 */
export const ReportMessageModal = ({ isOpen, message, onClose, onReported }) => {
    const [reason, setReason] = useState("");
    const [formError, setFormError] = useState(null);
    const reasonRef = useRef(null);

    const { isLoading, execute } = useReportChatMessage();

    useEffect(() => {
        if (isOpen) {
            setReason("");
            setFormError(null);
        }
    }, [isOpen, message]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmed = reason.trim();
        if (!trimmed) {
            setFormError("Tell the moderators why this message should be reviewed.");
            return;
        }

        setFormError(null);

        try {
            const report = await execute(message.id, { reason: trimmed });
            onReported?.(report);
            onClose?.();
        } catch (error) {
            setFormError(getChatErrorMessage(error, "The message could not be reported."));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={isLoading ? undefined : onClose}
            title="Report message"
            description="A room moderator will review this message."
            size="md"
            initialFocusRef={reasonRef}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleSubmit}
                        loading={isLoading}
                        loadingText="Reporting…"
                    >
                        <FiFlag aria-hidden="true" />
                        Report message
                    </Button>
                </>
            )}
        >
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {message && (
                    <div className="rounded-xl bg-neutral-50 p-3">
                        <p className="text-xs font-semibold text-neutral-700">
                            {message.senderDisplayName}
                        </p>
                        <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm text-neutral-700">
                            {message.content}
                        </p>
                    </div>
                )}

                {/* Textarea renders its own Field wrapper, so the label, error
                    and hint are passed to it directly. */}
                <Textarea
                    id="chat-report-reason"
                    ref={reasonRef}
                    label="Reason"
                    required
                    error={formError}
                    hint={`${reason.length}/${REASON_MAX_LENGTH} characters`}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={REASON_MAX_LENGTH}
                    rows={4}
                    placeholder="This message is harassing another member."
                    disabled={isLoading}
                />

                <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
            </form>
        </Modal>
    );
};
