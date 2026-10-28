// Single source of truth for the persisted auth session. The axios
// interceptor, SignalR token factory, and route guards all read through
// these helpers so browser storage and React state stay in sync.

const STORAGE_KEY = "nexus_auth_session";
const LEGACY_KEYS = ["token", "userId", "roles", "expiresOn"];

const emptySession = () => ({
    token: null,
    userId: null,
    roles: [],
    expiresOn: null,
});

const removeLegacyKeys = () => {
    LEGACY_KEYS.forEach((key) => window.localStorage.removeItem(key));
};

export const readSession = () => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptySession();

        const parsed = JSON.parse(raw);
        return {
            token: parsed?.token || null,
            userId: parsed?.userId || null,
            roles: Array.isArray(parsed?.roles) ? parsed.roles : [],
            expiresOn: parsed?.expiresOn || null,
        };
    } catch {
        return emptySession();
    }
};

export const saveSession = (session) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        removeLegacyKeys();
    } catch {
        // Storage can be unavailable in private browsing; the in-memory
        // session still works for the current tab.
    }
};

export const clearSession = () => {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
        removeLegacyKeys();
    } catch {
        // Nothing to clear when storage is unavailable.
    }
};

export const getToken = () => readSession().token;

export const getUserId = () => readSession().userId;

export const getRoles = () => readSession().roles;
