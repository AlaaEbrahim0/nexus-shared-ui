import { useCallback, useEffect, useRef, useState } from "react";
import apiClient, { getApiErrorMessage } from "./client";
import { createClientMessageId, mergeChatMessages } from "../utils/chat";
import { mergeChatReactionUpdate } from "../utils/reactions";
import { MODERATION_REQUEST_TIMEOUT_MS } from "../utils/moderationState";

// Chat API client.
//
// Every chat endpoint answers with plain JSON. The axios error is deliberately
// left intact (unlike community.api.js, which rethrows error.response.data) so
// that components can branch on error.response?.status: 404 means "not a
// member or no such room", 409 is a conflict (archived room, duplicate report,
// idempotency clash) and 429 is a rate limit. The machine readable Chat.* code
// is read out of the ProblemDetails "errors" array.

const request = async (promise) => (await promise).data;

const ROOM_PAGE_SIZE = 20;
const MESSAGE_PAGE_SIZE = 50;
const RECOVERY_PAGE_SIZE = 100;

// A long disconnection must not turn into an endless request loop. Fifty pages
// of a hundred messages is five thousand messages of backlog.
const MAX_RECOVERY_PAGES = 50;

export const getChatRooms = (params) =>
    request(apiClient.get("/api/chat/rooms", { params }));

export const getChatRoom = (roomId) =>
    request(apiClient.get(`/api/chat/rooms/${roomId}`));

/**
 * Rooms the signed-in user is an active member of, for the composer's group
 * audience. The directory endpoint pages through every listable room, so this
 * follows a bounded number of pages rather than loading the whole platform.
 */
export const getMyChatRooms = async () => {
    const memberRooms = [];
    let beforeRoomId = null;
    let pageCount = 0;

    do {
        const page = await getChatRooms({
            limit: 50,
            ...(beforeRoomId ? { beforeRoomId } : {}),
        });
        memberRooms.push(
            ...(page?.rooms || []).filter(
                (room) => room.isMember && !room.isArchived
            )
        );
        beforeRoomId = page?.nextBeforeRoomId ?? null;
        pageCount += 1;
    } while (beforeRoomId && pageCount < 5);

    return memberRooms;
};

// ---- Room invitations ---------------------------------------------------

/** Non-member accounts a moderator may invite, matched by name. */
export const getInviteCandidates = (roomId, search) =>
    request(apiClient.get(`/api/chat/rooms/${roomId}/invite-candidates`, {
        params: { search: search?.trim() || undefined },
    }));

export const inviteToRoom = (roomId, userIds) =>
    request(apiClient.post(`/api/chat/rooms/${roomId}/invitations`, { userIds }));

export const getRoomInvitations = (roomId) =>
    request(apiClient.get(`/api/chat/rooms/${roomId}/invitations`));

export const cancelRoomInvitation = (roomId, invitationId) =>
    apiClient.delete(`/api/chat/rooms/${roomId}/invitations/${invitationId}`).then(() => undefined);

/** Invitations waiting on the signed-in user's decision. */
export const getMyInvitations = () =>
    request(apiClient.get("/api/chat/invitations/mine"));

export const acceptChatInvitation = (invitationId) =>
    request(apiClient.post(`/api/chat/invitations/${invitationId}/accept`));

export const declineChatInvitation = (invitationId) =>
    request(apiClient.post(`/api/chat/invitations/${invitationId}/decline`));

export const createChatRoom = (payload) =>
    request(apiClient.post("/api/chat/rooms", payload));

// The join body is optional on the server: a room without a passphrase accepts
// an empty POST, so a body is only sent when a passphrase was collected.
//
// The failure carries the mapped copy because the join modal is shared and has
// no access to this portal's error table; without it the modal would print the
// server's own detail sentence.
export const joinChatRoom = async (roomId, passphrase) => {
    try {
        return await request(apiClient.post(
            `/api/chat/rooms/${roomId}/join`,
            passphrase ? { passphrase } : undefined));
    } catch (error) {
        error.friendlyMessage = getChatErrorMessage(error);
        throw error;
    }
};

// POST /leave answers 204 No Content, so there is no body to unwrap and the
// resolved value is undefined. That is a success, not a missing response.
export const leaveChatRoom = (roomId) =>
    apiClient.post(`/api/chat/rooms/${roomId}/leave`).then(() => undefined);

// Marks the caller's read position in the room. Answers 204, like leave.
export const markChatRoomRead = (roomId) =>
    apiClient.put(`/api/chat/rooms/${roomId}/read`).then(() => undefined);

export const getChatRoomMembers = (roomId) =>
    request(apiClient.get(`/api/chat/rooms/${roomId}/members`));

export const getChatMessages = (roomId, params) =>
    request(apiClient.get(`/api/chat/rooms/${roomId}/messages`, { params }));

export const sendChatMessage = (roomId, payload) =>
    request(apiClient.post(`/api/chat/rooms/${roomId}/messages`, payload, {
        // The message is moderated before it is stored, and the model behind
        // that check can be starting up. Outlast the server rather than
        // reporting a failure for a send that was still going to succeed.
        timeout: MODERATION_REQUEST_TIMEOUT_MS,
    }));

export const deleteChatMessage = (messageId) =>
    request(apiClient.delete(`/api/chat/messages/${messageId}`));

export const setChatMessageReaction = (messageId, reaction) =>
    request(apiClient.put(`/api/chat/messages/${messageId}/reactions`, { reaction }));

export const removeChatMessageReaction = (messageId) =>
    request(apiClient.delete(`/api/chat/messages/${messageId}/reactions`));

export const reportChatMessage = (messageId, payload) =>
    request(apiClient.post(`/api/chat/messages/${messageId}/reports`, payload));

export const getChatRoomReports = (roomId, params) =>
    request(apiClient.get(`/api/chat/rooms/${roomId}/reports`, { params }));

export const updateChatReportStatus = (roomId, reportId, status) =>
    request(apiClient.patch(`/api/chat/rooms/${roomId}/reports/${reportId}`, { status }));

export const updateChatMemberRole = (roomId, memberId, role) =>
    request(apiClient.patch(`/api/chat/rooms/${roomId}/members/${memberId}/role`, { role }));

export const archiveChatRoom = (roomId) =>
    request(apiClient.post(`/api/chat/rooms/${roomId}/archive`));

export const browseChatRooms = (params) =>
    request(apiClient.get("/api/chat/rooms/browse", { params }));

export const updateChatRoom = (roomId, payload) =>
    request(apiClient.patch(`/api/chat/rooms/${roomId}`, payload));

export const lockChatRoom = (roomId) =>
    request(apiClient.post(`/api/chat/rooms/${roomId}/lock`));

export const unlockChatRoom = (roomId) =>
    request(apiClient.post(`/api/chat/rooms/${roomId}/unlock`));

export const updateChatRoomPrivacy = (roomId, visibility) =>
    request(apiClient.put(`/api/chat/rooms/${roomId}/privacy`, { visibility }));

export const setChatRoomPassphrase = (roomId, passphrase) =>
    request(apiClient.put(`/api/chat/rooms/${roomId}/passphrase`, { passphrase }));

// DELETE /passphrase answers 204; there is no room body to unwrap.
export const clearChatRoomPassphrase = (roomId) =>
    apiClient.delete(`/api/chat/rooms/${roomId}/passphrase`).then(() => undefined);

export const updateChatRoomSchedule = (roomId, scheduledStartAtUtc) =>
    request(apiClient.put(`/api/chat/rooms/${roomId}/scheduled`, { scheduledStartAtUtc }));

// The server binds the file from a form field named "image"; the field name is
// part of the API contract. The content type is left to the browser so the
// multipart boundary is generated correctly.
export const uploadChatRoomCover = (roomId, file) => {
    const form = new FormData();
    form.append("image", file);
    return request(apiClient.put(`/api/chat/rooms/${roomId}/cover`, form));
};

export const removeChatRoomCover = (roomId) =>
    request(apiClient.delete(`/api/chat/rooms/${roomId}/cover`));

/**
 * Uploads one image, video or voice clip for a message in this room and
 * resolves to { url, type }. The field name "file" is part of the API contract.
 * onProgress receives 0-100 so the composer can show a real upload bar.
 */
export const uploadChatRoomMedia = (roomId, file, onProgress) => {
    const form = new FormData();
    form.append("file", file);

    return apiClient
        .post(`/api/chat/rooms/${roomId}/media`, form, {
            // A 20 MB video on a slow link outlasts the client default.
            timeout: 120000,
            onUploadProgress: (event) => {
                if (!onProgress || !event.total) return;
                onProgress(Math.round((event.loaded * 100) / event.total));
            },
        })
        .then((response) => response.data);
};

/**
 * Read the machine readable code out of an RFC 7807 chat problem body.
 *
 * The API puts the code in extensions.errors[].code, for example
 * "Chat.RoomNotFound" or "Chat.ModerationUnavailable".
 */
export const getChatErrorCode = (error) => {
    const payload = error?.response?.data;
    const entries = Array.isArray(payload?.errors) ? payload.errors : [];

    return entries[0]?.code || null;
};

/**
 * Resolve a chat error into a message a doctor can act on.
 *
 * The API already sends a safe human sentence in ProblemDetails.detail, but a
 * few codes deserve a clearer wording on the client: the sender is the one
 * who can fix them.
 */
export const getChatErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
    const status = error?.response?.status;
    const code = getChatErrorCode(error);

    switch (code) {
        case "Chat.ContentRejected":
            return "Your message breaks the community content policy and was not sent.";
        case "Chat.ModerationUnavailable":
            return "The safety check didn't finish - it can be slow to start after a quiet period - so your message was not sent. It was not rejected. Try again in a moment.";
        case "Chat.RoomArchived":
            return "This room has been archived and no longer accepts new activity.";
        case "Chat.RoomLocked":
            return "This room is paused. You can read, but nobody can post or join until a moderator resumes it.";
        case "Chat.RoomPassphraseRequired":
            return "This room needs a password to join.";
        case "Chat.RoomPassphraseIncorrect":
            return "Incorrect room password. Try again.";
        case "Chat.InvalidRoomPassphrase":
            return "Room passwords must be 8 to 128 characters and cannot contain control characters.";
        case "Chat.InvalidScheduledStart":
            return "Pick a start time in the future, no more than 90 days ahead.";
        case "Chat.InvalidRoomCover":
            return "Choose an image file for the room cover.";
        case "Chat.InvalidMessageMedia":
            return "That file could not be attached. Choose an image, video or voice clip and try again.";
        case "Reactions.InvalidReaction":
            return "That reaction is not available. Please try another one.";
        case "Chat.CreateRoomForbidden":
            return "Your account cannot create rooms.";
        case "Chat.OwnerCannotLeave":
            return "The room owner cannot leave. Archive the room instead.";
        case "Chat.ReportAlreadyExists":
            return "You have already reported this message.";
        case "Chat.ClientMessageIdConflict":
            return "This message was already sent with different content.";
        case "Chat.ModeratorRequired":
            return "Only the room owner or a doctor moderator can do that.";
        case "Chat.OwnerRequired":
            return "Only the room owner can do that.";
        case "Chat.ModeratorMustBeDoctor":
            return "Only doctor members can be assigned the Moderator role.";
        case "Chat.CannotReportOwnMessage":
            return "You cannot report your own message.";
        case "Chat.RoomNotFound":
            return "This room is not available to you anymore.";
        default:
            if (status === 429) {
                return "You have reached the rate limit for this action. Please try again later.";
            }

            return getApiErrorMessage(error, fallback);
    }
};

/**
 * Highest confirmed (server assigned) message id in a list.
 *
 * Message ids are the chronological order and the pagination cursor, so the
 * highest one is the resume point for afterId recovery. Optimistic messages
 * carry a negative temporary id and are ignored on purpose: the recovery
 * cursor must point at a row that exists on the server.
 */
const getHighestConfirmedMessageId = (messages) =>
    messages.reduce((highest, message) => {
        if (!message || !(message.id > 0)) return highest;
        if (highest == null || message.id > highest) return message.id;

        return highest;
    }, null);

/**
 * Lowest confirmed (server assigned) message id in a list.
 *
 * Used as the beforeId cursor when loading older history: everything strictly
 * older than the oldest message we already hold is still on the server.
 */
const getLowestConfirmedMessageId = (messages) =>
    messages.reduce((lowest, message) => {
        if (!message || !(message.id > 0)) return lowest;
        if (lowest == null || message.id < lowest) return message.id;

        return lowest;
    }, null);

const useAsyncAction = (action) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (...args) => {
        setIsLoading(true);
        setError(null);

        try {
            return await action(...args);
        } catch (requestError) {
            setError(requestError);
            throw requestError;
        } finally {
            setIsLoading(false);
        }
    }, [action]);

    return { isLoading, error, execute };
};

/**
 * Deduplicate concurrent identical requests.
 *
 * Two calls are equivalent only when they use the same loader identity *and*
 * the same arguments. Arguments alone are not enough: a room hook rebuilds its
 * loader when the room id changes, and `loadLatest()` takes no arguments in
 * both rooms. Keying only by arguments would make the new room await the old
 * room's request and, because the old response is then discarded by the room
 * guard, the new room would never load.
 *
 * The in-flight map is therefore nested under the loader function in a WeakMap.
 * StrictMode's duplicate mount call reuses the same loader identity and is
 * still collapsed, while a new room/loader starts its own request.
 *
 * This helper deliberately deduplicates while a request is in flight. A caller
 * that must bypass an in-flight request after a mutation (for example, reload
 * the room list after creating a room) should call the underlying loader
 * directly instead of the single-flight wrapper.
 */
export const useSingleFlight = (loader) => {
    const inFlightRef = useRef(new WeakMap());
    const loaderRef = useRef(loader);
    loaderRef.current = loader;

    return useCallback((...args) => {
        const activeLoader = loaderRef.current;

        let inFlightMap = inFlightRef.current.get(activeLoader);
        if (!inFlightMap) {
            inFlightMap = new Map();
            inFlightRef.current.set(activeLoader, inFlightMap);
        }

        const key = JSON.stringify(args);
        const existing = inFlightMap.get(key);
        if (existing) {
            return existing;
        }

        // Call the loader synchronously so StrictMode's duplicate call sees the
        // in-flight entry immediately, and so callers can observe the request
        // starting in the same tick. A synchronous throw is converted into a
        // rejected promise, which keeps the cleanup path uniform.
        let loaded;
        try {
            loaded = activeLoader(...args);
        } catch (error) {
            loaded = Promise.reject(error);
        }

        const promise = Promise.resolve(loaded).finally(() => {
            if (inFlightMap.get(key) === promise) {
                inFlightMap.delete(key);
            }
        });

        inFlightMap.set(key, promise);
        return promise;
    }, []);
};

/**
 * The room directory.
 *
 * The API pages rooms with a beforeRoomId cursor and orders them by descending
 * id. The cursor is kept in a ref so that "load" stays referentially stable
 * and the page can call it from a mount effect without re-triggering itself.
 */
export function useChatRooms() {
    const [rooms, setRooms] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const cursorRef = useRef(null);
    const requestIdRef = useRef(0);

    const load = useCallback(async ({ append = false } = {}) => {
        // Every load (initial page, load more, explicit refresh) gets a
        // sequence number. Only the newest request may commit. Without this,
        // an initial page that resolves after a post-create refresh could
        // overwrite the fresh list with stale data.
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        const cursor = append ? cursorRef.current : null;

        setIsLoading(true);
        setError(null);

        try {
            const params = { limit: ROOM_PAGE_SIZE };
            if (append && cursor != null) {
                params.beforeRoomId = cursor;
            }

            const page = await getChatRooms(params);
            if (requestIdRef.current !== requestId) return null;

            const pageRooms = page?.rooms || [];

            cursorRef.current = page?.nextBeforeRoomId ?? null;
            setRooms((previous) => (append ? [...previous, ...pageRooms] : pageRooms));
            setHasMore(Boolean(page?.hasMore));

            return page;
        } catch (requestError) {
            if (requestIdRef.current === requestId) {
                setError(requestError);
            }
            throw requestError;
        } finally {
            if (requestIdRef.current === requestId) {
                setIsLoading(false);
            }
        }
    }, []);

    const loadMore = useCallback(() => load({ append: true }), [load]);

    // StrictMode runs the mount effect twice, so the first page is fetched
    // once. "Load more" is a user action and is never collapsed. `refresh`
    // calls the loader directly: it must not be swallowed by an older
    // in-flight first-page request after a room has just been created.
    const loadFirstPage = useSingleFlight(load);

    return {
        rooms,
        hasMore,
        isLoading,
        error,
        load: loadFirstPage,
        refresh: load,
        loadMore,
    };
}

/**
 * The paged room directory behind the rooms page.
 *
 * Browse is offset-paged because a sorted, filtered list has no stable cursor.
 * "Load more" reuses the filters of the page it extends, so a filter change
 * mid-paging cannot splice pages from two different result sets; the request
 * sequence number keeps a slow page from overwriting a newer filter.
 */
export function useChatRoomBrowse(pageSize = 12) {
    const [rooms, setRooms] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const pageRef = useRef(1);
    const queryRef = useRef({ search: "", tab: "All", sort: "Recent" });
    const requestIdRef = useRef(0);

    const load = useCallback(async ({
        search = "",
        tab = "All",
        sort = "Recent",
        append = false,
    } = {}) => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;

        const query = append ? queryRef.current : { search, tab, sort };
        queryRef.current = query;
        const pageNumber = append ? pageRef.current + 1 : 1;

        setIsLoading(true);
        setError(null);

        try {
            const result = await browseChatRooms({
                search: query.search || undefined,
                tab: query.tab,
                sort: query.sort,
                pageNumber,
                pageSize,
            });
            if (requestIdRef.current !== requestId) return null;

            const pageRooms = result?.rooms || [];
            pageRef.current = pageNumber;
            setRooms((previous) => (append ? [...previous, ...pageRooms] : pageRooms));
            setTotalCount(result?.totalCount || 0);
            setHasMore(Boolean(result?.hasMore));

            return result;
        } catch (requestError) {
            if (requestIdRef.current === requestId) {
                setError(requestError);
            }
            throw requestError;
        } finally {
            if (requestIdRef.current === requestId) {
                setIsLoading(false);
            }
        }
    }, [pageSize]);

    return { rooms, totalCount, hasMore, isLoading, error, load };
}

/**
 * A single room snapshot.
 *
 * The snapshot is the source of truth for "am I a member", "what is my role"
 * and "is the room archived". It is replaced wholesale by the room page
 * whenever a fresh copy arrives from the API or from a SubscribeToRoom
 * handshake (both are scoped to the current user).
 */
export function useChatRoom(roomId) {
    const [room, setRoom] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // A response may arrive after the route has already switched to another
    // room. It must not overwrite the new room's state.
    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;

    useEffect(() => {
        setRoom(null);
        setError(null);
        setIsLoading(false);
    }, [roomId]);

    const execute = useCallback(async () => {
        if (!roomId) return null;

        const requestedRoomId = roomId;
        setIsLoading(true);
        setError(null);

        try {
            const result = await getChatRoom(requestedRoomId);
            if (roomIdRef.current !== requestedRoomId) return null;

            setRoom(result);
            return result;
        } catch (requestError) {
            if (roomIdRef.current === requestedRoomId) {
                setError(requestError);

                // A 404 means the room is gone or the current user is no
                // longer a member. Keeping the previous snapshot would leave
                // cached messages visible after access was revoked, so the
                // refresh path must drop it.
                if (requestError?.response?.status === 404) {
                    setRoom(null);
                }
            }
            throw requestError;
        } finally {
            if (roomIdRef.current === requestedRoomId) {
                setIsLoading(false);
            }
        }
    }, [roomId]);

    return { room, setRoom, isLoading, error, execute };
}

/**
 * The active member list of a room.
 *
 * The endpoint is member-only, so it is only called when the current user is
 * an active member of the room.
 */
export function useChatMembers(roomId, enabled = true) {
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    useEffect(() => {
        setMembers([]);
        setError(null);
        setIsLoading(false);
    }, [roomId]);

    const execute = useCallback(async () => {
        if (!roomId) return [];

        const requestedRoomId = roomId;
        if (!enabledRef.current) return [];

        setIsLoading(true);
        setError(null);

        try {
            const result = await getChatRoomMembers(requestedRoomId);
            if (roomIdRef.current !== requestedRoomId || !enabledRef.current) {
                return null;
            }

            const list = result || [];
            setMembers(list);
            return list;
        } catch (requestError) {
            if (roomIdRef.current === requestedRoomId && enabledRef.current) {
                setError(requestError);
            }
            throw requestError;
        } finally {
            if (roomIdRef.current === requestedRoomId && enabledRef.current) {
                setIsLoading(false);
            }
        }
    }, [roomId]);

    // StrictMode runs the mount effect twice, so the member list is fetched
    // once instead of twice.
    const loadMembers = useSingleFlight(execute);

    useEffect(() => {
        if (!enabled || !roomId) {
            // A former member must not keep a cached roster after the
            // membership is revoked.
            setMembers([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        loadMembers().catch(() => undefined);
    }, [enabled, roomId, loadMembers]);

    return { members, setMembers, isLoading, error, execute };
}

/**
 * The report queue of a room. Only the owner and doctor moderators may read
 * it, so it is loaded for moderators only.
 */
export function useChatReports(roomId, enabled = true) {
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    useEffect(() => {
        setReports([]);
        setError(null);
        setIsLoading(false);
    }, [roomId]);

    useEffect(() => {
        if (!enabled) {
            // Reports contain reported message content. Drop the cached queue
            // when the current user loses moderator access or leaves the room.
            setReports([]);
            setError(null);
            setIsLoading(false);
        }
    }, [enabled]);

    const execute = useCallback(async (status) => {
        if (!roomId || !enabledRef.current) return [];

        const requestedRoomId = roomId;
        setIsLoading(true);
        setError(null);

        try {
            const params = { limit: 50 };
            if (status) params.status = status;

            const result = await getChatRoomReports(requestedRoomId, params);
            if (roomIdRef.current !== requestedRoomId || !enabledRef.current) {
                return null;
            }

            const list = result || [];
            setReports(list);
            return list;
        } catch (requestError) {
            if (roomIdRef.current === requestedRoomId && enabledRef.current) {
                setError(requestError);
            }
            throw requestError;
        } finally {
            if (roomIdRef.current === requestedRoomId && enabledRef.current) {
                setIsLoading(false);
            }
        }
    }, [roomId]);

    return { reports, setReports, isLoading, error, execute };
}

/**
 * The message list of a room.
 *
 * Two rules shape this hook:
 *
 * 1. The list lives in a ref that is updated at commit time, not in an effect.
 *    A SignalR callback can fire before React has re-rendered, and the
 *    recovery loop must see the newest list even then.
 * 2. Every loader merges instead of replacing, so a page load, a history
 *    request and a live event can overlap without losing messages and without
 *    duplicating them. mergeChatMessages dedupes by server id and reconciles
 *    the sender's optimistic message by clientMessageId.
 */
export function useChatMessages(roomId, enabled = true) {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [error, setError] = useState(null);
    const [hasMore, setHasMore] = useState(false);

    const messagesRef = useRef([]);
    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;
    const temporaryIdRef = useRef(0);

    const commit = useCallback((updater) => {
        const next = typeof updater === "function"
            ? updater(messagesRef.current)
            : updater;

        messagesRef.current = next;
        setMessages(next);

        return next;
    }, []);

    // A different room invalidates every page of history that was loaded for
    // the previous one, including any pending optimistic message.
    useEffect(() => {
        messagesRef.current = [];
        temporaryIdRef.current = 0;
        setMessages([]);
        setHasMore(false);
        setIsLoading(false);
        setIsLoadingOlder(false);
        setError(null);
    }, [roomId]);

    // Losing membership must also drop the cached conversation. The server
    // stops returning it, and keeping it in memory would let a removed member
    // keep reading a room they no longer belong to.
    useEffect(() => {
        if (!enabled) {
            messagesRef.current = [];
            temporaryIdRef.current = 0;
            setMessages([]);
            setHasMore(false);
            setIsLoading(false);
            setIsLoadingOlder(false);
            setError(null);
        }
    }, [enabled]);

    /**
     * Load the newest page of history for display.
     */
    const loadLatest = useCallback(async () => {
        if (!enabledRef.current || !roomId) return null;

        const requestedRoomId = roomId;
        setIsLoading(true);
        setError(null);

        try {
            const page = await getChatMessages(requestedRoomId, { limit: MESSAGE_PAGE_SIZE });
            if (roomIdRef.current !== requestedRoomId || !enabledRef.current) {
                return null;
            }

            commit((previous) => mergeChatMessages(previous, page.messages || []));
            setHasMore(Boolean(page?.hasMore));

            return page;
        } catch (requestError) {
            if (roomIdRef.current === requestedRoomId && enabledRef.current) {
                setError(requestError);
            }
            throw requestError;
        } finally {
            if (roomIdRef.current === requestedRoomId && enabledRef.current) {
                setIsLoading(false);
            }
        }
    }, [roomId, commit]);

    // StrictMode runs the mount effect twice. The merge is idempotent, so a
    // duplicated history request would not corrupt the list, but it would
    // still be a wasted round trip.
    const loadLatestOnce = useSingleFlight(loadLatest);

    /**
     * Load the page of history that is older than what we hold.
     *
     * The cursor is the oldest confirmed id we already have. The server keeps
     * the newest window for a beforeId query, so the returned page is
     * prepended by the merge.
     */
    const loadOlder = useCallback(async () => {
        if (!enabledRef.current || !roomId) return null;

        const requestedRoomId = roomId;
        const oldestId = getLowestConfirmedMessageId(messagesRef.current);
        if (oldestId == null) return null;

        setIsLoadingOlder(true);

        try {
            const page = await getChatMessages(requestedRoomId, {
                beforeId: oldestId,
                limit: MESSAGE_PAGE_SIZE,
            });
            if (roomIdRef.current !== requestedRoomId || !enabledRef.current) {
                return null;
            }

            commit((previous) => mergeChatMessages(previous, page.messages || []));
            setHasMore(Boolean(page?.hasMore));

            return page;
        } catch (requestError) {
            if (roomIdRef.current === requestedRoomId && enabledRef.current) {
                setError(requestError);
            }
            throw requestError;
        } finally {
            if (roomIdRef.current === requestedRoomId && enabledRef.current) {
                setIsLoadingOlder(false);
            }
        }
    }, [roomId, commit]);

    /**
     * Recover the messages that were missed while the client was offline.
     *
     * The loop asks for everything newer than the newest confirmed id we
     * hold and follows the server's nextAfterId cursor. nextAfterId is the
     * cursor for the next request, not a stop signal: it is only set while
     * more messages remain. The loop ends when it is null, when a page comes
     * back empty, or when the page cap is reached.
     */
    const recoverAfterLatest = useCallback(async () => {
        if (!enabledRef.current || !roomId) return 0;

        const requestedRoomId = roomId;
        let cursor = getHighestConfirmedMessageId(messagesRef.current);
        let recovered = 0;

        // Nothing confirmed is held. The room was empty when the history was
        // loaded, so a newest page query is needed to catch whatever arrived
        // between the history request and the subscription.
        if (cursor == null) {
            const latest = await getChatMessages(requestedRoomId, {
                limit: RECOVERY_PAGE_SIZE,
            });
            if (roomIdRef.current !== requestedRoomId || !enabledRef.current) {
                return 0;
            }

            const incoming = latest?.messages || [];
            if (incoming.length === 0) return 0;

            commit((previous) => mergeChatMessages(previous, incoming));
            recovered += incoming.length;
            cursor = getHighestConfirmedMessageId(incoming);
        }

        for (let page = 0; page < MAX_RECOVERY_PAGES; page += 1) {
            const result = await getChatMessages(requestedRoomId, {
                afterId: cursor,
                limit: RECOVERY_PAGE_SIZE,
            });
            if (roomIdRef.current !== requestedRoomId || !enabledRef.current) {
                break;
            }

            const incoming = result?.messages || [];
            if (incoming.length === 0) break;

            commit((previous) => mergeChatMessages(previous, incoming));
            recovered += incoming.length;

            const nextCursor = result.nextAfterId;
            if (nextCursor == null || nextCursor <= cursor) break;

            cursor = nextCursor;
        }

        return recovered;
    }, [roomId, commit]);

    /**
     * Add a local pending message.
     *
     * The client mints the clientMessageId: it is the server side idempotency
     * key, so a retry with the same key returns the original message instead
     * of creating a second one. The temporary id is negative so it can never
     * collide with a server id.
     */
    const addOptimistic = useCallback((content, sender = {}, media = {}) => {
        if (!enabledRef.current) return null;

        temporaryIdRef.current -= 1;

        const optimistic = {
            id: temporaryIdRef.current,
            roomId,
            senderMemberId: sender.memberId ?? null,
            clientMessageId: createClientMessageId(),
            senderDisplayName: sender.displayName || "You",
            senderIsDoctor: Boolean(sender.isDoctor),
            content,
            mediaUrl: media.url || null,
            mediaType: media.type || null,
            sentAtUtc: new Date().toISOString(),
            isDeleted: false,
            pending: true,
            failed: false,
        };

        commit((previous) => mergeChatMessages(previous, [optimistic]));

        return optimistic;
    }, [roomId, commit]);

    /**
     * Replace a pending message with the persisted one.
     */
    const confirmMessage = useCallback((serverMessage) => {
        if (!serverMessage || !enabledRef.current) return;

        commit((previous) => mergeChatMessages(previous, [serverMessage]));
    }, [commit]);

    /**
     * Insert or replace a message that arrived from the server, for example
     * through the hub or the delete endpoint.
     */
    const upsertMessage = useCallback((serverMessage) => {
        if (!serverMessage || !enabledRef.current) return;

        commit((previous) => mergeChatMessages(previous, [serverMessage]));
    }, [commit]);

    /**
     * Apply a neutral MessageReactionsUpdated broadcast.
     *
     * The counts are authoritative for every viewer. The actor's own reaction
     * is resolved locally with the caller's member id because one payload is
     * delivered to the whole room and cannot carry a per-viewer flag.
     */
    const applyReactionUpdate = useCallback((update, myMemberId) => {
        if (!update || !enabledRef.current) return;

        commit((previous) =>
            previous.map((message) =>
                message.id === update.messageId
                    ? mergeChatReactionUpdate(message, update, myMemberId)
                    : message
            )
        );
    }, [commit]);

    /**
     * Remove a pending optimistic message that failed to send.
     *
     * A message rejected by moderation (or lost to a network error) must not
     * linger in the list as a permanent "not sent" row. It is dropped here and
     * the composer restores the draft so the sender can fix and retry. Only the
     * local optimistic copy (negative id) is ever removed; a confirmed server
     * message is left untouched, and if a send actually did persist, recovery
     * re-adds it by its clientMessageId.
     */
    const removeMessage = useCallback((clientMessageId) => {
        commit((previous) => previous.filter((message) => !(
            message.clientMessageId === clientMessageId && !(message.id > 0)
        )));
    }, [commit]);

    return {
        messages,
        isLoading,
        isLoadingOlder,
        error,
        hasMore,
        loadLatest: loadLatestOnce,
        loadOlder,
        recoverAfterLatest,
        addOptimistic,
        confirmMessage,
        upsertMessage,
        applyReactionUpdate,
        removeMessage,
    };
}

export function useCreateChatRoom() {
    return useAsyncAction(createChatRoom);
}

export function useJoinChatRoom() {
    return useAsyncAction(joinChatRoom);
}

export function useLeaveChatRoom() {
    return useAsyncAction(leaveChatRoom);
}

export function useSendChatMessage() {
    return useAsyncAction(sendChatMessage);
}

export function useDeleteChatMessage() {
    return useAsyncAction(deleteChatMessage);
}

export function useReportChatMessage() {
    return useAsyncAction(reportChatMessage);
}

export function useUpdateChatReportStatus() {
    return useAsyncAction(updateChatReportStatus);
}

export function useUpdateChatMemberRole() {
    return useAsyncAction(updateChatMemberRole);
}

export function useArchiveChatRoom() {
    return useAsyncAction(archiveChatRoom);
}

export function useUpdateChatRoom() {
    return useAsyncAction(updateChatRoom);
}

export function useLockChatRoom() {
    return useAsyncAction(lockChatRoom);
}

export function useUnlockChatRoom() {
    return useAsyncAction(unlockChatRoom);
}

export function useUpdateChatRoomPrivacy() {
    return useAsyncAction(updateChatRoomPrivacy);
}

export function useSetChatRoomPassphrase() {
    return useAsyncAction(setChatRoomPassphrase);
}

export function useClearChatRoomPassphrase() {
    return useAsyncAction(clearChatRoomPassphrase);
}

export function useUpdateChatRoomSchedule() {
    return useAsyncAction(updateChatRoomSchedule);
}

export function useUploadChatRoomCover() {
    return useAsyncAction(uploadChatRoomCover);
}

export function useRemoveChatRoomCover() {
    return useAsyncAction(removeChatRoomCover);
}
