/**
 * Nexus Shared UI - Community components
 *
 * Forum and feed components. They import react-markdown (ESM only), so they are
 * kept out of the main "./index" barrel: Create React App's Jest configuration
 * does not transform node_modules, and loading them through the primitives entry
 * breaks every unit test that imports it.
 *
 * Canonical source: https://github.com/AlaaEbrahim0/nexus-shared-ui
 * Vendored into each portal by scripts/shared-ui-sync.mjs — edit here, never in a portal.
 */

export { Post } from "./Post";
export { Comment } from "./Comment";
export { Reply } from "./Reply";
export { UpdatePostModal } from "./UpdatePostModal";
export { CustomDeletionModal } from "./CustomDeletionModal";
export { CustomToast } from "./CustomToast";
export { FilterationComponent } from "./FilterationComponent";
export { Notification } from "./Notification";
export { NotificationsList } from "./NotificationList";
export { PostSkeleton } from "./PostSkeleton";

// Chat room directory. RoomCard and JoinRoomModal render no markdown, but the
// room UI is grouped here so a portal keeps one entry point for it.
export { RoomCard } from "../chat/RoomCard";
export { JoinRoomModal } from "../chat/JoinRoomModal";
export { filterRooms, CHAT_ROOM_TABS, CHAT_ROOM_SORTS } from "../chat/roomsFilter";
