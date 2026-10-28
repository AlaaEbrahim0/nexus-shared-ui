/**
 * @nexus/shared-ui
 *
 * Shared UI foundations for the Nexus (Mental Mediator) doctor and patient portals.
 *
 * Prefer direct sub-path imports for better tree-shaking:
 *   import { Button, Card } from "@nexus/shared-ui/components/ui"
 *   import { ProfileView } from "@nexus/shared-ui/components/profile"
 *   import { useChatHub } from "@nexus/shared-ui/hooks"
 *
 * This root entry re-exports everything for convenience.
 */

// UI primitives and community components
export * from "./components/ui/index";

// Profile components and utilities
export { ProfileView } from "./components/profile/ProfileView";
export { CertificateModal } from "./components/profile/CertificateModal";
export { QualificationModal } from "./components/profile/QualificationModal";
export {
    getMemberProfilePath,
    humanizeEnum,
    formatSpecialization,
    getDisplayName,
    getInitials,
    getProfilePhoto,
    getCoverPhoto,
    safeHttpUrl,
    SPECIALIZATIONS,
    SOCIAL_FIELDS,
    PROFILE_PHOTO_FALLBACK,
} from "./components/profile/profileUtils";

// Hooks
export { useChatHub } from "./hooks/useChatHub";

// Context providers
export { NotificationsProvider, useNotifications } from "./context/notificationsContext";
export { UserProfileProvider, useUserProfile } from "./context/profileContext";

// Auth utilities
export { default as AuthProvider, useAuth } from "./auth/authProvider";
export {
    readSession,
    saveSession,
    clearSession,
    getToken,
    getUserId,
    getRoles,
} from "./auth/session";

// API client
export {
    default as apiClient,
    API_BASE_URL,
    getApiErrorMessage,
    getApiErrorMessages,
} from "./api/client";

// Utilities
export { convertUtcToRelativeTime } from "./utils/utcToRelativeTime";
