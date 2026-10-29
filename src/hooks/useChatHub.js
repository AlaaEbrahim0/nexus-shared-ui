import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { getToken } from "../auth/session";
import { API_BASE_URL } from "../api/client";

/**
 * The live connection of a single chat room.
 *
 * Design notes:
 *
 * - One connection per open room. The room directory does not need live data,
 *   and a connection that outlives the room page would keep receiving events
 *   for a room the doctor is no longer looking at.
 * - The token is read from the persisted session inside the factory instead
 *   of from React state. SignalR reconnects on its own and may call the
 *   factory long after the state that created the connection is gone.
 * - Automatic reconnect only restores the socket. Group membership is bound
 *   to the connection id, so a reconnect has to subscribe again and then
 *   recover the messages that were missed.
 * - Nothing is logged at Information level or below, and no payload is ever
 *   logged: message bodies are health information.
 */
export const useChatHub = (
    roomId,
    {
        enabled = true,
        onMessageCreated,
        onMessageDeleted,
        onMemberUpdated,
        onMemberLeft,
        onRoomArchived,
        onRoomUpdated,
        onSubscribed,
        onReconnected,
    } = {}
) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    // The handlers are kept in a ref so that a new inline callback identity
    // does not tear down and rebuild the socket.
    const handlersRef = useRef({});
    handlersRef.current = {
        onMessageCreated,
        onMessageDeleted,
        onMemberUpdated,
        onMemberLeft,
        onRoomArchived,
        onRoomUpdated,
        onSubscribed,
        onReconnected,
    };

    useEffect(() => {
        if (!enabled || !roomId) return undefined;

        let isCancelled = false;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/chat-hub`, {
                accessTokenFactory: () => getToken(),
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        const subscribe = async () => {
            const result = await connection.invoke("SubscribeToRoom", roomId);

            if (!result?.success) {
                throw new Error(result?.message || "Could not subscribe to this room.");
            }

            return result.data;
        };

        const start = async () => {
            try {
                await connection.start();
                if (isCancelled) return;

                setIsConnected(true);
                setError(null);

                const snapshot = await subscribe();
                if (isCancelled) return;

                handlersRef.current.onSubscribed?.(snapshot);
            } catch (startError) {
                if (isCancelled) return;

                // A failed socket must not break the page: the REST history
                // endpoints still work and the room stays readable.
                setIsConnected(false);
                setError(startError);
            }
        };

        connection.on("MessageCreated", (message) => {
            handlersRef.current.onMessageCreated?.(message);
        });

        connection.on("MessageDeleted", (message) => {
            handlersRef.current.onMessageDeleted?.(message);
        });

        connection.on("MemberUpdated", (member) => {
            handlersRef.current.onMemberUpdated?.(member);
        });

        connection.on("MemberLeft", (memberId) => {
            handlersRef.current.onMemberLeft?.(memberId);
        });

        connection.on("RoomArchived", (room) => {
            handlersRef.current.onRoomArchived?.(room);
        });

        // Lock, unlock, privacy, schedule and cover changes. The payload is a
        // room snapshot built for the broadcasting moderator, so consumers
        // must merge room level fields only (see mergeRoomUpdateEvent).
        connection.on("RoomUpdated", (room) => {
            handlersRef.current.onRoomUpdated?.(room);
        });

        connection.onreconnected(async () => {
            if (isCancelled) return;

            setIsConnected(true);

            try {
                // Group membership does not survive a reconnect, so the room
                // has to be subscribed again before the backlog is recovered.
                const snapshot = await subscribe();
                if (isCancelled) return;

                handlersRef.current.onSubscribed?.(snapshot);
                handlersRef.current.onReconnected?.();
            } catch (resubscribeError) {
                if (isCancelled) return;

                setIsConnected(false);
                setError(resubscribeError);
            }
        });

        connection.onreconnecting(() => {
            setIsConnected(false);
        });

        connection.onclose(() => {
            setIsConnected(false);
        });

        start();

        return () => {
            isCancelled = true;

            // Stopping the connection drops every group membership, so an
            // explicit unsubscribe is only a courtesy for the server side
            // connection registry.
            const unsubscribe = connection.state === signalR.HubConnectionState.Connected
                ? connection.invoke("UnsubscribeFromRoom", roomId).catch(() => undefined)
                : Promise.resolve();

            unsubscribe
                .catch(() => undefined)
                .then(() => connection.stop().catch(() => undefined));
        };
    }, [roomId, enabled]);

    return { isConnected, error };
};
