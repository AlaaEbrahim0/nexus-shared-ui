import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, readSession, saveSession } from "./session";

const AuthContext = createContext();

// Browsers clamp setTimeout delays to a signed 32-bit integer (2147483647 ms).
// A 30 day token would need ~2.6e9 ms, so the timer used to overflow and fire
// *immediately*, wiping the session right after a successful sign-in. Chunk the
// wait into timers that are always below the limit instead.
const MAX_TIMEOUT_DELAY = 2147483647;
const EXPIRY_CHECK_INTERVAL = 60 * 1000;

const AuthProvider = ({ children }) => {
    const [session, setSession] = useState(() => readSession());

    const { token, userId, roles, expiresOn } = session;

    const updateSession = useCallback(
        (patch) => setSession((previous) => ({ ...previous, ...patch })),
        []
    );

    const signOut = useCallback(() => {
        clearSession();
        setSession({ token: null, userId: null, roles: [], expiresOn: null });
    }, []);

    // Persist the session whenever it changes. Writing through a single helper
    // keeps localStorage in lockstep with React state.
    useEffect(() => {
        if (token) {
            saveSession({ token, userId, roles, expiresOn });
        } else {
            clearSession();
        }
    }, [token, userId, roles, expiresOn]);

    useEffect(() => {
        if (!token) return undefined;

        const expiry = expiresOn ? new Date(expiresOn).getTime() : 0;

        const expire = () => {
            clearSession();
            setSession({ token: null, userId: null, roles: [], expiresOn: null });
        };

        // A token without a usable expiry cannot be scheduled, so fall back to a
        // periodic check instead of arming a bogus timer.
        if (!expiry || Number.isNaN(expiry)) {
            const interval = window.setInterval(() => {
                if (expiry && expiry <= Date.now()) expire();
            }, EXPIRY_CHECK_INTERVAL);
            return () => window.clearInterval(interval);
        }

        if (expiry <= Date.now()) {
            expire();
            return undefined;
        }

        let remaining = expiry - Date.now();
        const timers = [];

        const schedule = () => {
            // Never schedule more than the browser supports in one go.
            const delay = Math.min(remaining, MAX_TIMEOUT_DELAY);
            const timer = window.setTimeout(() => {
                remaining -= delay;
                if (remaining <= 0) {
                    expire();
                    return;
                }
                schedule();
            }, delay);
            timers.push(timer);
        };

        schedule();

        const handleExpired = () => expire();
        window.addEventListener("auth:expired", handleExpired);

        return () => {
            timers.forEach((timer) => window.clearTimeout(timer));
            window.removeEventListener("auth:expired", handleExpired);
        };
    }, [token, expiresOn]);

    const contextValue = useMemo(
        () => ({
            token,
            setToken: (value) => updateSession({ token: value }),
            userId,
            setUserId: (value) => updateSession({ userId: value }),
            roles,
            setRoles: (value) => updateSession({ roles: value }),
            expiresOn,
            setExpiresOn: (value) => updateSession({ expiresOn: value }),
            signOut,
        }),
        [token, userId, roles, expiresOn, signOut, updateSession]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;
