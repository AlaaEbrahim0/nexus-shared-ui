/**
 * Nexus Shared UI - Primitive Components
 *
 * These components form the foundational design system for both
 * the doctor and patient portals.
 *
 * Canonical source: https://github.com/AlaaEbrahim0/nexus-shared-ui
 * Vendored into each portal by scripts/shared-ui-sync.mjs — edit here, never in a portal.
 */

export {
    Alert,
    Badge,
    Button,
    Card,
    ConfirmDialog,
    ErrorState,
    EmptyState,
    Field,
    Input,
    Modal,
    Select,
    Skeleton,
    SkeletonText,
    Spinner,
    Textarea,
} from "./primitives";

export { Post } from "./Post";
export { Comment } from "./Comment";
export { Reply } from "./Reply";
export { CreatePostModal } from "./CreatePostModal";
export { UpdatePostModal } from "./UpdatePostModal";
export { CustomDeletionModal } from "./CustomDeletionModal";
export { CustomToast } from "./CustomToast";
export { FilterationComponent } from "./FilterationComponent";
export { Notification } from "./Notification";
export { NotificationsList } from "./NotificationList";
export { PostSkeleton } from "./PostSkeleton";
