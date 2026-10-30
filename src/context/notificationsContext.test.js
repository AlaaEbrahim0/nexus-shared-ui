import { act, render, screen, waitFor } from "@testing-library/react";
import { NotificationsProvider, useNotifications } from "./notificationsContext";

jest.mock("@microsoft/signalr", () => {
    class FakeConnection {
        constructor() {
            this.state = 0;
            this.handlers = {};
            this.startCalls = [];
            this.stopCalls = [];
            this.start = jest.fn(() => {
                this.state = 1;
                const deferred = global.__startDeferred;
                if (deferred && deferred.manual) {
                    return deferred.promise;
                }
                this.state = 2;
                return Promise.resolve();
            });
            this.stop = jest.fn(() => {
                this.stopCalls.push(Date.now());
                this.state = 0;
                return Promise.resolve();
            });
            this.on = jest.fn((name, handler) => {
                this.handlers[name] = handler;
            });
            this.off = jest.fn((name) => {
                delete this.handlers[name];
            });
            this.onreconnecting = jest.fn((handler) => {
                this.reconnectingHandler = handler;
            });
            this.onreconnected = jest.fn((handler) => {
                this.reconnectedHandler = handler;
            });
            this.onclose = jest.fn((handler) => {
                this.closeHandler = handler;
            });
        }
    }

    class HubConnectionBuilder {
        withUrl() {
            return this;
        }

        withAutomaticReconnect() {
            return this;
        }

        configureLogging() {
            return this;
        }

        build() {
            global.__connection = new FakeConnection();
            return global.__connection;
        }
    }

    return {
        HubConnectionBuilder,
        HubConnectionState: {
            Disconnected: 0,
            Connecting: 1,
            Connected: 2,
            Disconnecting: 3,
            Reconnecting: 4,
        },
        LogLevel: { Warning: 3 },
    };
});

jest.mock("../auth/authProvider", () => ({
    useAuth: () => ({ token: "test-token" }),
}));

jest.mock("../auth/session", () => ({
    getToken: () => "test-token",
}));

jest.mock("../api/client", () => ({
    API_BASE_URL: "https://api.example",
}));

jest.mock("../api/notifications.api", () => ({
    getUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAllNotificationsRead: jest.fn(),
    markNotificationRead: jest.fn(),
}));

jest.mock("react-hot-toast", () => ({
    __esModule: true,
    default: { success: jest.fn() },
}));

const api = require("../api/notifications.api");

const Consumer = () => {
    const { count, loading } = useNotifications();
    return (
        <div>
            <span data-testid="count">{count}</span>
            <span data-testid="loading">{String(loading)}</span>
        </div>
    );
};

const renderProvider = () =>
    render(
        <NotificationsProvider>
            <Consumer />
        </NotificationsProvider>
    );

beforeEach(() => {
    jest.clearAllMocks();
    global.__startDeferred = null;
    api.getUserNotifications.mockResolvedValue([
        { id: 1, isRead: false },
        { id: 2, isRead: true },
    ]);
    api.getUnreadCount.mockResolvedValue(7);
});

describe("NotificationsProvider", () => {
    it("uses the server unread count instead of the first page", async () => {
        renderProvider();

        await waitFor(() => expect(api.getUnreadCount).toHaveBeenCalled());
        expect(screen.getByTestId("count")).toHaveTextContent("7");
        expect(global.__connection.start).toHaveBeenCalled();
    });

    it("does not stop a connection while start is still resolving", async () => {
        let resolveStart;
        const startPromise = new Promise((resolve) => {
            resolveStart = resolve;
        });
        global.__startDeferred = { manual: true, promise: startPromise };

        const { unmount } = renderProvider();
        await waitFor(() => expect(global.__connection.start).toHaveBeenCalled());

        unmount();
        expect(global.__connection.stop).not.toHaveBeenCalled();

        await act(async () => {
            resolveStart();
            await startPromise;
        });

        await waitFor(() =>
            expect(global.__connection.stop).toHaveBeenCalled()
        );
    });

    it("refetches persisted notifications after reconnecting", async () => {
        renderProvider();
        await waitFor(() => expect(global.__connection.start).toHaveBeenCalled());
        api.getUserNotifications.mockClear();

        act(() => {
            global.__connection.reconnectedHandler();
        });

        await waitFor(() => expect(api.getUserNotifications).toHaveBeenCalled());
    });
});
