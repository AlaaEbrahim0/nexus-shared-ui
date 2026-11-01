import { useState } from "react";
import { FiCheck, FiInbox, FiX } from "react-icons/fi";
import { Button } from "../ui/primitives";
import { convertUtcToRelativeTime } from "../../utils/utcToRelativeTime";

/**
 * Pending room invitations awaiting the current user's decision. Accepting is
 * what creates the membership; declining only records the response. The list is
 * rendered by the rooms directory in both portals.
 */
export const RoomInvitationList = ({
    invitations = [],
    onAccept,
    onDecline,
    isLoading = false,
}) => {
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");

    if (!isLoading && invitations.length === 0) return null;

    const respond = async (invitation, accept) => {
        setBusyId(invitation.id);
        setError("");
        try {
            await (accept ? onAccept : onDecline)?.(invitation);
        } catch {
            setError("We could not update that invitation. Please try again.");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4" aria-label="Room invitations">
            <div className="mb-3 flex items-center gap-2 text-neutral-900">
                <FiInbox aria-hidden="true" className="text-primary-800" />
                <h2 className="text-sm font-bold uppercase tracking-wide">Room invitations</h2>
                {invitations.length > 0 && (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white">
                        {invitations.length}
                    </span>
                )}
            </div>

            {error && <p role="alert" className="mb-2 text-sm font-semibold text-error">{error}</p>}

            {isLoading ? (
                <div className="h-14 animate-pulse rounded-xl bg-neutral-100" />
            ) : (
                <ul className="space-y-2">
                    {invitations.map((invitation) => (
                        <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-base-100 p-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-neutral-900">{invitation.roomName || "A room"}</p>
                                <p className="mt-0.5 text-xs text-neutral-600">
                                    {invitation.invitedByName ? `${invitation.invitedByName} invited you · ` : ""}
                                    {convertUtcToRelativeTime(invitation.createdAtUtc)}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busyId === invitation.id}
                                    onClick={() => respond(invitation, false)}
                                >
                                    <FiX aria-hidden="true" /> Decline
                                </Button>
                                <Button
                                    size="sm"
                                    variant="primary"
                                    loading={busyId === invitation.id}
                                    loadingText="Joining…"
                                    onClick={() => respond(invitation, true)}
                                >
                                    <FiCheck aria-hidden="true" /> Accept
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
};
