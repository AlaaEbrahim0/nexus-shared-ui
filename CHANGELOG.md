# Changelog

All notable changes to `@nexus/shared-ui` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

> In this repo the **pinned commit SHA** in each portal's `.shared-ui.json` is what guarantees
> reproducibility; `version` in `package.json` is a label only, and there is no build or publish
> step to release.

## [Unreleased]

Nothing pending.

## [0.1.0] - 2026-11-01

Promotion of the shared chat surface at commit `f082cb5`
(`feat(chat): promote shared chat surface (composer, create/report/reports, chat api, chat utils)`).

### Added

- `src/api/chat.api.js` — canonical chat API module: room, message, member, invitation,
  report, media, and room-management endpoints plus the matching React hooks
  (`useChatRooms`, `useChatRoom`, `useChatRoomBrowse`, `useChatMembers`, `useChatMessages`,
  `useChatReports`, `useCreateChatRoom`, `useReportChatMessage`,
  `useUpdateChatReportStatus`, …) and the error helpers `getChatErrorCode` / `getChatErrorMessage`.
  The axios error is passed through untouched so call sites can branch on
  `error.response?.status` (404 / 409 / 429) and read the machine-readable `Chat.*`
  ProblemDetails code.
- `src/utils/chat.js` — chat permission and state helpers (`isRoomOwner`, `canModerateRoom`,
  `isOwnChatMessage`, `canDeleteChatMessage`, `canReportChatMessage`,
  `canManageChatMemberRole`), report status constants (`CHAT_REPORT_STATUSES`,
  `CHAT_REPORT_FILTERS`), optimistic-list utilities (`createClientMessageId`,
  `mergeChatMessages`, `upsertChatMember`, `removeChatMember`, `mergeRoomMemberEvent`,
  `markRoomMemberLeft`, `mergeRoomArchiveEvent`, `mergeRoomUpdateEvent`), and timestamp
  formatting (`formatChatTimestamp`, `formatChatDay`, `chatDayKey`).
- `src/components/chat/ChatComposer.js` — message composer (Enter sends, Shift+Enter newline,
  media upload on pick, draft retained until a send succeeds).
- `src/components/chat/CreateRoomModal.js` — room creation form; creates the room over JSON, then
  uploads the cover as a separate multipart call.
- `src/components/chat/ReportMessageModal.js` — report-a-message dialog for room moderators.
- `src/components/chat/RoomReportsPanel.js` — the room report queue with the
  `Open → Reviewed | Dismissed | Actioned` transitions the server allows.

### Changed

- These six modules were previously **duplicated** as byte-identical copies in `patient-ui` and
  `doctor-ui`, so every fix had to be applied twice. They now live here and are vendored into both
  portals; nothing moved on the portal side beyond the copied files.
- Both portals re-pinned to `f082cb5d2f2d45de0b38f43fbea2cc9de9f7d1fd` and added the six paths to
  their `files` lists: `patient-ui` now vendors 45 files, `doctor-ui` 51. `shared-ui:check`
  reports both portals in sync.

### Notes

- No prop injection or import rewiring was needed at the call sites: these modules depend only on
  already-vendored shared modules (`src/api/client.js`, `src/utils/moderationState.js`,
  `src/components/ui/index.js`, `src/hooks/useModerationStage.js`) and on third-party packages
  both portals already install (`react`, `react-icons`, `react-hot-toast`), so no `peerDependencies`
  or portal dependency changed.
- The chat surface is imported by **direct path** (`../components/chat/ChatComposer`,
  `../../api/chat.api`, `../utils/chat`) and is deliberately not re-exported from
  `src/components/ui/index.js`, which stays free of ESM-only dependencies.
- `ChatMessageItem.js` and `RoomMembersPanel.js` stayed portal-local on purpose — they genuinely
  diverge (the doctor versions add profile links).
- No design-token changes in this pass: `tailwind.config.js` and `src/index.css` were untouched.

[unreleased]: https://github.com/AlaaEbrahim0/nexus-shared-ui/commits/master
[0.1.0]: https://github.com/AlaaEbrahim0/nexus-shared-ui/commit/f082cb5d2f2d45de0b38f43fbea2cc9de9f7d1fd
