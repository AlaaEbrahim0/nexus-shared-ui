/**
 * Nexus Shared UI - Primitive Components
 *
 * These components form the foundational design system for both
 * the doctor and patient portals.
 *
 * Canonical source: https://github.com/AlaaEbrahim0/nexus-shared-ui
 * Vendored into each portal by scripts/shared-ui-sync.mjs — edit here, never in a portal.
 *
 * This entry point is deliberately limited to the dependency-light primitives.
 * The community components (Post, Comment, Reply, …) live in ./community because
 * they pull in react-markdown, which ships ESM only: Create React App's Jest
 * config does not transform node_modules and cannot be overridden without
 * ejecting, so re-exporting them here made every test that imports "../ui"
 * fail to parse. Consumers that need them import "./community" explicitly.
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
