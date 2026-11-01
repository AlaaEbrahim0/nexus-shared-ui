import { useCallback, useEffect, useRef, useState } from "react";
import { FiCheck, FiSearch, FiUserPlus, FiX } from "react-icons/fi";
import { Avatar, Button, EmptyState, Modal } from "../ui/primitives";

const DEBOUNCE_MS = 350;

/**
 * Invite non-members to a room. The portal supplies `search` and `invite`
 * (which hit the authorized backend); this component never trusts ids it did
 * not receive from the server, and the backend re-validates membership and
 * permissions on submit.
 */
export const RoomInviteModal = ({
    isOpen,
    onClose,
    roomName,
    search,
    invite,
}) => {
    const [query, setQuery] = useState("");
    const [candidates, setCandidates] = useState([]);
    const [selected, setSelected] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const requestId = useRef(0);

    const runSearch = useCallback(async (term) => {
        if (typeof search !== "function") return;
        const id = ++requestId.current;
        setIsSearching(true);
        setError("");
        try {
            const results = await search(term);
            if (id !== requestId.current) return;
            setCandidates(Array.isArray(results) ? results : []);
        } catch {
            if (id !== requestId.current) return;
            setCandidates([]);
            setError("We could not load people to invite. Try again.");
        } finally {
            if (id === requestId.current) setIsSearching(false);
        }
    }, [search]);

    useEffect(() => {
        if (!isOpen) {
            setQuery("");
            setCandidates([]);
            setSelected([]);
            setError("");
            setDone(false);
            setIsInviting(false);
            return undefined;
        }
        const timer = window.setTimeout(() => runSearch(""), DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [isOpen, runSearch]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const timer = window.setTimeout(() => runSearch(query), DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
        // Skip the first run right after open; the effect above already fired it.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    const toggle = (candidate) => {
        setSelected((previous) =>
            previous.some((item) => item.id === candidate.id)
                ? previous.filter((item) => item.id !== candidate.id)
                : [...previous, candidate]
        );
        setDone(false);
    };

    const selectedIds = new Set(selected.map((item) => item.id));

    const submit = async () => {
        if (!selected.length || isInviting) return;
        setIsInviting(true);
        setError("");
        try {
            await invite(selected.map((item) => item.id));
            setDone(true);
            setSelected([]);
        } catch {
            setError("The invitation could not be sent. Please try again.");
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Invite to room"
            description={roomName ? `Add people to ${roomName}. They join only after they accept.` : "Invited people join only after they accept."}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button
                        variant="primary"
                        onClick={submit}
                        loading={isInviting}
                        loadingText="Sending…"
                        disabled={!selected.length}
                    >
                        <FiUserPlus aria-hidden="true" />
                        {selected.length ? `Invite ${selected.length}` : "Invite"}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}
                {done && (
                    <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                        <FiCheck aria-hidden="true" /> Invitations sent. They can accept from their notifications.
                    </p>
                )}

                <div className="relative">
                    <FiSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search by name"
                        aria-label="Search people to invite"
                        className="input input-bordered w-full rounded-xl border-neutral-300 bg-base-100 pl-10 text-sm"
                    />
                </div>

                {selected.length > 0 && (
                    <div className="flex flex-wrap gap-2" aria-label="Selected people">
                        {selected.map((person) => (
                            <span key={person.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-sm font-semibold text-primary-900">
                                {person.displayName || person.id}
                                <button type="button" onClick={() => toggle(person)} aria-label={`Remove ${person.displayName || person.id}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/20">
                                    <FiX aria-hidden="true" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <ul className="max-h-72 space-y-1 overflow-y-auto" aria-label="Invitation candidates" aria-busy={isSearching}>
                    {isSearching && candidates.length === 0 ? (
                        <li className="px-2 py-6 text-center text-sm text-neutral-600">Searching…</li>
                    ) : candidates.length === 0 ? (
                        <li>
                            <EmptyState title="No one else to invite" description="Everyone matching your search is already a member or invited." />
                        </li>
                    ) : (
                        candidates.map((person) => {
                            const isSelected = selectedIds.has(person.id);
                            return (
                                <li key={person.id}>
                                    <button
                                        type="button"
                                        onClick={() => toggle(person)}
                                        aria-pressed={isSelected}
                                        className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${isSelected ? "bg-primary/10" : "hover:bg-neutral-100"}`}
                                    >
                                        <Avatar src={person.photoUrl} name={person.displayName} size="h-9 w-9" textSize="text-sm" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-neutral-900">{person.displayName || "Unnamed"}</span>
                                            <span className="block text-xs text-neutral-600">{person.isDoctor ? "Doctor" : "Member"}</span>
                                        </span>
                                        {isSelected && <FiCheck aria-hidden="true" className="text-primary-700" />}
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>
        </Modal>
    );
};
