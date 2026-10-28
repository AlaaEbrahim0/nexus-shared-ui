import axios from "axios";
import { getToken } from "../auth/session";

// The base URL often comes from an env file that ends with a slash. Axios
// would then request "//api/..." and the SignalR hub URL is built by string
// concatenation, which produced a double slash and a 404. Normalize once.
export const API_BASE_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { Accept: "application/json" },
    timeout: 30000,
});

apiClient.interceptors.request.use(
    (config) => {
        // Public endpoints can opt out of the bearer token. This keeps a
        // public profile reachable even when the browser holds an expired or
        // otherwise invalid session token.
        if (config.skipAuth) {
            config.headers.delete("Authorization");
            return config;
        }

        const token = getToken();
        if (token) {
            config.headers.set("Authorization", `Bearer ${token}`);
        } else {
            config.headers.delete("Authorization");
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 401) {
            // The session is genuinely invalid. Let the auth provider clear it so
            // the route guard can send the user back to the login page.
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("auth:expired"));
            }
        } else if (status === 403) {
            // A forbidden response means the account lacks the required role.
            // Redirecting to login would be wrong: the user IS authenticated.
            error.apiMessage = "Your account does not have access to this resource.";
        }

        if (!error.response) {
            error.message = error.code === "ECONNABORTED"
                ? "The request timed out. Please try again."
                : "Unable to connect to the server. Check your connection and try again.";
        } else {
            const payload = error.response.data;
            error.apiMessage =
                payload?.detail ||
                payload?.message ||
                payload?.title ||
                error.message;
        }

        return Promise.reject(error);
    }
);

/**
 * Resolve the response payload from either an axios error or a bare payload.
 *
 * The api modules use an `unwrap` helper that rethrows `error.response.data`,
 * which strips the axios wrapper. Both shapes have to be understood.
 */
const getPayload = (error) => {
    if (!error || typeof error !== "object") return null;
    if (error.response?.data) return error.response.data;
    if (error.isAxiosError) return null;
    return error;
};

/**
 * Pull a human readable message out of an API error.
 *
 * The API answers with RFC 7807 problem details. Depending on the endpoint the
 * reason can live in `detail`, in a flat `errors[]` array of {code, description}
 * or in an `errors` dictionary of field -> messages. Read all of them.
 */
export const getApiErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
    const payload = getPayload(error);

    const fromErrorsArray = Array.isArray(payload?.errors)
        ? payload.errors
            .map((entry) => entry?.description || entry?.message || entry?.title)
            .filter(Boolean)[0]
        : null;

    const fromErrorsDictionary =
        payload?.errors && !Array.isArray(payload.errors)
            ? Object.values(payload.errors).flat().filter(Boolean)[0]
            : null;

    return (
        error?.apiMessage ||
        payload?.detail ||
        payload?.message ||
        payload?.title ||
        fromErrorsArray ||
        fromErrorsDictionary ||
        error?.message ||
        fallback
    );
};

/**
 * Collect every message the API returned, for forms that show a list.
 */
export const getApiErrorMessages = (error) => {
    const payload = getPayload(error);

    if (Array.isArray(payload?.errors)) {
        const messages = payload.errors
            .map((entry) => entry?.description || entry?.message || entry?.title)
            .filter(Boolean);
        if (messages.length) return messages;
    }

    if (payload?.errors && !Array.isArray(payload.errors)) {
        const messages = Object.entries(payload.errors)
            .flatMap(([field, entries]) =>
                (Array.isArray(entries) ? entries : [entries]).map(
                    (message) => `${field}: ${message}`
                )
            )
            .filter(Boolean);
        if (messages.length) return messages;
    }

    const single = getApiErrorMessage(error, "");
    return single ? [single] : [];
};

export default apiClient;
