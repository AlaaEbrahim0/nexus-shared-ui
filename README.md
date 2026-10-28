# @nexus/shared-ui

Shared UI foundations for the **Nexus (Mental Mediator)** platform: design tokens, primitive components, community components, and utilities used by both the doctor and patient portals.

This repo is the **canonical source**. It is not published to a registry and is not resolved from
`node_modules` — each portal vendors the files it needs at a pinned commit (see
[How portals consume this repo](#how-portals-consume-this-repo)).

---

## What's in here

Paths are mirrored exactly into each portal, so `src/components/ui/primitives.js` here lands at
`src/components/ui/primitives.js` there.

| Path | Contents |
|------|----------|
| `tailwind.config.js` | Canonical design tokens — palette, DaisyUI theme (`nexus`), typography, spacing, shadows |
| `src/index.css` | Global CSS variables, font import, base resets |
| `src/components/ui/` | Primitives (`Button`, `Card`, `Input`, `Modal`, …), community components (`Post`, `Comment`, `Reply`, …) |
| `src/components/profile/` | `ProfileView`, `CertificateModal`, `QualificationModal`, `profileUtils` |
| `src/hooks/` | `useChatHub` |
| `src/context/` | `NotificationsProvider`, `UserProfileProvider` |
| `src/auth/` | `AuthProvider`, session helpers (`getToken`, `saveSession`, …) |
| `src/api/` | Axios client with JWT interceptor and error helpers |
| `src/utils/` | `convertUtcToRelativeTime` |
| `scripts/shared-ui-sync.mjs` | The vendoring tool consumed by both portals |

---

## How portals consume this repo

The portals **vendor** the files they share: each portal keeps a copy of the canonical sources
inside its own `src/`, pinned to a commit in this repo.

This is deliberate, not a shortcut. Both portals are Create React App (`react-scripts`), whose
Babel rule is `include: paths.appSrc` — JSX is transpiled **only** under the app's own `src/`.
A `github:`/`node_modules` dependency that ships raw JSX would fail both production builds
unless craco or react-app-rewired were added, so neither the registry publication nor the
git-dependency route is actually usable here without a build-tool override.

Each portal has:

| File | Purpose |
|------|---------|
| `.shared-ui.json` | The pin: repo URL, commit `ref`, `version`, and the exact `files` this portal vendors |
| `scripts/shared-ui-sync.mjs` | Copies the pinned files in; `check` mode exits non-zero on drift |

```bash
# in doctor-ui or patient-ui
npm run shared-ui:sync              # vendor the pinned files in
npm run shared-ui:check             # CI guard: fail if the copies have drifted
npm run shared-ui:sync -- --ref <commit-sha>   # move to a new upstream commit, then sync
```

The sync script uses a sibling `../shared-ui` checkout only when it already sits at the pinned
commit; otherwise it clones the pinned commit from GitHub. CI and Vercel therefore never depend
on a developer-local filesystem path.

### What is shared

- **Design tokens** — `tailwind.config.js` (palette, DaisyUI `nexus` theme, spacing, radii, shadows).
- **UI primitives** — `Button`, `Card`, `Input`, `Select`, `Textarea`, `Modal`, `Alert`, `Badge`, `Spinner`, `Skeleton`, `EmptyState`, `ErrorState`, `ConfirmDialog`, and the barrel `index.js`.
- **Community components** — `Post`, `Comment`, `Reply`, `CreatePostModal`, `UpdatePostModal`, `Notification`, `NotificationList`, `PostSkeleton`, `CustomToast`, `CustomDeletionModal`, `FilterationComponent`.
- **Infrastructure** — the Axios client (`src/api/client.js`), session helpers (`src/auth/session.js`), `AuthProvider`, `notificationsContext`, `useChatHub`, `profileUtils`, `convertUtcToRelativeTime`.

### What is deliberately **not** shared

- Portal pages, navigation, and information architecture.
- `context/profileContext.js` — doctor and patient profile shapes differ; each portal owns its copy.
- Doctor-only profile components (`ProfileView`, `CertificateModal`, `QualificationModal`) — vendored by `doctor-ui` only.
- Any domain rules, authorisation, or pricing. The .NET API remains the single source of truth for those.
- No secrets or credentials: `REACT_APP_API_URL` is supplied by each portal's own environment.

Consumers import from their vendored copy, never from `@nexus/shared-ui`:

```jsx
import { Button, Card } from "../components/ui";          // primitives entry
import { Post, Comment } from "../components/ui/community"; // or by direct path
```

### Why `ui/index.js` exports only primitives

`Post`, `Comment`, and `Reply` import `react-markdown`, which is **ESM only**. Create React App's
Jest configuration never transforms `node_modules` and cannot be extended without ejecting, so a
barrel that re-exports those components makes *every* test importing `"../ui"` fail with
`SyntaxError: Unexpected token 'export'` — including tests that only touch `Button` or `Input`.

`index.js` therefore stays dependency-light, and `community.js` is the explicit opt-in entry for
the heavier components. Follow the same rule for anything new that pulls an ESM-only package:
keep it out of `index.js`.

### Packages the vendored files require

Nothing here is bundled — each portal must already provide the packages its vendored files
import. `peerDependencies` in `package.json` is the union; `formik`, `yup`, and `moment` are
optional because only a subset of portals vendors the files that use them.

| Package | Used by | doctor-ui | patient-ui |
|---------|---------|-----------|------------|
| `react`, `react-dom`, `react-router-dom`, `axios`, `react-icons`, `react-hot-toast`, `framer-motion`, `react-markdown` | primitives, community components, API client | ✅ | ✅ |
| `@microsoft/signalr` | `hooks/useChatHub.js`, `context/notificationsContext.js` | ✅ | ✅ |
| `moment` | `utils/utcToRelativeTime.js` | ✅ | ✅ |
| `formik`, `yup` | `components/profile/CertificateModal.js`, `QualificationModal.js` | ✅ | ➖ not vendored |

Adding a new third-party import to a shared file means adding that dependency to **both** portals
before re-pinning, or the portal that omits it will fail its build.

---

## How to update

### Making a change

1. Edit the source files in this repo. Portal copies are never edited directly — they are overwritten by the sync.
2. Commit with a Conventional Commits message (`fix:`, `feat:`, `chore:`) and push to `master`.
3. Bump `version` in `package.json` when the change is worth a release label. The pin itself is a commit SHA, and that is what guarantees reproducibility.

### Consuming the update in a portal

```bash
# In doctor-ui or patient-ui:
npm run shared-ui:sync -- --ref <commit-sha>
npm run shared-ui:check
npm run build
```

Commit the re-pinned `.shared-ui.json` together with the synced files, then redeploy. Repeat in
the other portal. Both portals may sit at different pins temporarily; CI catches any copy that
was edited in place instead of synced.

---

## Architecture

```
                    nexus-shared-ui (this repo — canonical source, pinned by commit SHA)
                                  │
                       scripts/shared-ui-sync.mjs
                    (vendoring; no node_modules resolution)
                       ┌──────────┴──────────┐
                       ▼                     ▼
        mental_mediator_doctor_ui…   mental_mediator_patient_ui…
        src/components/ui/*          src/components/ui/*
        src/components/profile/*     src/components/profile/profileUtils.js
        tailwind.config.js           tailwind.config.js
                       │                     │
                       └────► nexus-api (.NET) ◄────┘

Token change  → edit tailwind.config.js here → re-pin + sync in both portals → redeploy both
Component change → edit here → re-pin + sync → commit → redeploy the affected portal(s)
```

---

## Related repositories

| Repository | Purpose |
|-----------|---------|
| [mental-mediator-api-graduation-project](https://github.com/AlaaEbrahim0/mental-mediator-api-graduation-project) | ASP.NET Core 8 backend API |
| [mental_mediator_doctor_ui_graduation_project](https://github.com/AlaaEbrahim0/mental_mediator_doctor_ui_graduation_project) | Doctor portal (React) |
| [mental_mediator_patient_ui_graduation_project-](https://github.com/AlaaEbrahim0/mental_mediator_patient_ui_graduation_project-) | Patient portal (React) |
