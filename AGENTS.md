# AGENTS.md — `@nexus/shared-ui`

Read this before changing anything in this repo. Also read [`CONTRIBUTING.md`](CONTRIBUTING.md)
for the step-by-step workflow and [`README.md`](README.md) for the wider picture.

## What this repo is

The **single canonical source** for the shared front-end layer of the Nexus (Mental Mediator)
mental-health platform — a graduation project currently in **feature freeze**. It contains:

- **Design tokens** — `tailwind.config.js` (palette, DaisyUI themes, typography, spacing, radii,
  shadows, z-index) and `src/index.css` (CSS custom properties, base resets, dark-theme bridge).
- **Shared components** — `src/components/ui/**` (primitives + community/forum surface),
  `src/components/chat/**`, `src/components/profile/**`, `src/components/media/**`,
  `src/components/history/**`, `src/components/routing/**`.
- **Shared plumbing** — `src/api/**` (Axios client, chat + notification endpoints),
  `src/auth/**` (AuthProvider, session), `src/context/**`, `src/hooks/**`, `src/theme/**`,
  `src/utils/**`.

The two consuming portals are **`patient-ui`** and **`doctor-ui`** (both Create React App, both
deployed on Vercel). The backend is a separate ASP.NET Core 8 repo; no domain rules,
authorisation, or pricing belong here.

## What this repo is **not**

- **Not an npm package.** `package.json` has scripts `test` and `check` only
  (`check` just echoes a note). There is **no build, no bundle, no publish step**, and nothing is
  resolved from `node_modules`. Do not add a bundler, `dist/`, `files`, or a release pipeline.
- Not a place where portal-specific pages, navigation, or layouts live.
- Correctness is **not** verifiable here alone: it is verified by running
  `npm run shared-ui:check` (and `npm run build`) **in a portal** after re-pinning.

## The vendoring model

Each portal keeps a **copy** of selected files from this repo inside its own `src/`, at a pinned
commit. Paths are mirrored one-to-one: `src/components/ui/primitives.js` here lands at
`src/components/ui/primitives.js` there.

Why vendoring rather than a dependency: `react-scripts` transpiles JSX only under the app's own
`src/` (its Babel rule is `include: paths.appSrc`), so raw-JSX sources coming from
`node_modules` or a `github:` dependency would fail both production builds unless craco or
react-app-rewired were introduced.

Per portal:

| File | Purpose |
|------|---------|
| `.shared-ui.json` | The pin: `repo`, `ref` (commit SHA), `version` (label only — the script ignores it), and `files` (the exact vendored set) |
| `scripts/shared-ui-sync.mjs` | Copies the pinned files in; `check` mode exits non-zero on drift or on a listed path missing upstream. The tool is **not** in either `files` list, so each portal's copy is maintained by hand — currently byte-identical to this repo's |
| `.github/workflows/shared-ui-drift.yml` | CI job that runs `npm run shared-ui:check` |

```bash
# run inside patient-ui or doctor-ui
npm run shared-ui:sync                      # vendor the pinned files in
npm run shared-ui:check                     # drift guard (exit 1 on drift/missing)
npm run shared-ui:sync -- --ref <sha>       # move the pin to <sha>, then sync
npm run shared-ui:sync -- --clone           # ignore the local sibling checkout, clone from GitHub
```

Behaviour worth knowing (read `scripts/shared-ui-sync.mjs` before assuming otherwise):

- A sibling `../shared-ui` checkout is used **only** when its `HEAD` equals the pinned `ref`;
  otherwise the pinned ref is cloned from GitHub, so CI and Vercel never depend on a local path.
- `--ref` writes `.shared-ui.json` first, then syncs, so it does pin + copy in one command.
  Do not combine `--ref` with `check` unless you mean to move the pin.
- The script **only copies**. It never deletes: remove a path upstream and the stale copy stays
  in the portal (delete it by hand). List a path that no longer exists upstream and the run fails
  with `missing upstream`.
- A file that is not listed in a portal's `files` array is portal-local by definition: the sync
  neither writes nor audits it.

**Current state (verified at commit `5446bd2`):** both portals are pinned to
`5446bd2ae8b0649efb2497cd80d982cff1d7c3e9` — `patient-ui` vendors 48 files, `doctor-ui` 54, and
both report `In sync` from `npm run shared-ui:check`.

## The rule

> **Every shared token or shared-component fix happens HERE, then gets re-pinned into both
> portals. Never edit the vendored copies inside a portal.**

A portal copy is an artifact of the sync. Editing it in place is overwritten on the next
`shared-ui:sync` and is caught (as drift) by `shared-ui:check`. Portal code may of course *import*
the vendored files — from their local path, never from `@nexus/shared-ui`:

```jsx
import { Button, Card } from "../components/ui";            // primitives entry
import { Post, Comment } from "../components/ui/community"; // markdown-bearing entry
import { ChatComposer } from "../components/chat/ChatComposer"; // chat surface: direct path
```

Keep **both portals on the same SHA**: a token or component fix landed for one portal only is a
guaranteed visual/behavioural divergence between patient and doctor views.

## Layout and how the token system works

- `tailwind.config.js` — `palette` (brand, neutral, success, warning, danger, info) is the literal
  source for the DaisyUI themes (`nexus` = light, `dark`) and for `primary-*`, `success-*`,
  `warning-*`, `danger-*`, `error-*`, `info-*` utility scales.
- `src/index.css` — RGB triplets (`--neutral-*`, `--slate-*`, `--canvas`, `--surface`, `--ink`,
  `--muted`, `--line`) plus the `--nexus-*` aliases and base styles.

These two are **mutually referenced, not generated from one another**: `neutral`/`slate` and the
`ink/muted/line/canvas/surface` colours are declared in `tailwind.config.js` as
`rgb(var(--token) / <alpha-value>)`, i.e. Tailwind defers to the CSS variables in `index.css`.
The only `theme()` calls in `index.css` are the radius/shadow aliases and the body font-family, so
a brand/neutral change normally needs an edit in `tailwind.config.js` **and** the matching
hand-written triplet in `src/index.css` — change one and the other silently disagrees.

Dark mode lives in `html[data-theme="dark"]` in `src/index.css`: semantic variables are remapped
(`--canvas`, `--surface`, `--ink`, `--muted`, `--line`, and the neutral/slate scales swap
direction), and a "theme bridge" section overrides individual light-tinted utilities (`.bg-white`,
`.bg-primary-50`, `.text-emerald-900`, …). Prefer semantic tokens (`surface`, `canvas`, `ink`,
`muted`, `line`, `primary`, `success`, `warning`, `danger`, `info`) over raw or light-only tints;
if you must add a light-tinted class, add its dark override to that section.

Entry points:

- `src/components/ui/index.js` — primitives only: `Alert`, `Badge`, `Button`, `Card`,
  `ConfirmDialog`, `ErrorState`, `EmptyState`, `Field`, `Input`, `Modal`, `Select`, `Skeleton`,
  `SkeletonText`, `Spinner`, `Textarea`.
- `src/components/ui/community.js` — the explicit opt-in entry for heavier components:
  `Post`, `Comment`, `Reply`, `UpdatePostModal`, `CustomDeletionModal`, `CustomToast`,
  `FilterationComponent`, `Notification`, `NotificationsList`, `PostSkeleton`, plus the room
  directory (`RoomCard`, `JoinRoomModal`, `filterRooms`, `CHAT_ROOM_TABS`, `CHAT_ROOM_SORTS`).
- `src/components/chat/*` — the chat surface has **no barrel**; import each module by direct path,
  and same for `src/api/chat.api.js` and `src/utils/chat.js`.

## The CRA / Jest ESM gotcha — keep `react-markdown` out of `ui/index.js`

`react-markdown` is ESM-only. Create React App's Jest configuration does not transform
`node_modules` and cannot be extended without ejecting, so **any** barrel that re-exports a
markdown-using component makes every test importing `"../ui"` fail with
`SyntaxError: Unexpected token 'export'` — including tests that only touch `Button`.

Therefore `src/components/ui/index.js` must stay dependency-light. Anything new that pulls in an
ESM-only package (`react-markdown` today, similar tomorrow) goes in `src/components/ui/community.js`
or its own module, never in `index.js`. The same discipline applies to the chat modules: they are
imported by direct path precisely so that `index.js` stays clean.

Related: `src/setupTests.js` and `src/components/ui/primitives.test.js` style tests run **here**
via `npm test`; several test files are additionally vendored into `doctor-ui`
(`src/components/chat/RoomCard.test.js`, `src/components/chat/roomsFilter.test.js`,
`src/components/profile/profileUtils.test.js`, `src/components/ui/primitives.test.js`) so the same
assertions guard the portal builds. `patient-ui` lists no test files in its manifest.

## Adding a file to the vendored set

1. Create the file in this repo at the path it should have in the portal (paths are mirrored).
2. Import only things that are already shared, or add the new dependency to **both** portals first
   (see below).
3. Commit to this repo and **push to `master`** — a portal can only pin a SHA that exists on
   GitHub (unless it happens to have a sibling `../shared-ui` checkout sitting on that SHA).
4. In each portal that should receive it, add the relative path to `files` in `.shared-ui.json`.
5. In each of those portals: `npm run shared-ui:sync -- --ref <new-sha>` then
   `npm run shared-ui:check`, then `npm test` / `npm run build`.
6. Commit the re-pinned `.shared-ui.json` together with the synced files.

New third-party import in a shared file ⇒ add that package to **both** portals' dependencies and
to `peerDependencies` here (use `peerDependenciesMeta` for anything only a subset vendors) before
re-pinning, or the portal without it fails its build.

Removing a shared file: remove it from this repo, from both manifests, re-pin and sync, then
delete the leftover copy in each portal by hand — the sync will not do it.

## What stays portal-local (do not vendor it)

- Portal pages, navigation, information architecture, routing tables.
- `patient-ui`/`doctor-ui` `src/components/chat/ChatMessageItem.js` and
  `RoomMembersPanel.js` — genuinely divergent (the doctor versions add profile links).
- `src/context/profileContext.js` — present in this repo but listed in **neither** manifest;
  doctor and patient profile shapes differ, each portal owns its copy.
- `postcss.config.js` and the Tailwind/PostCSS build wiring — portal-owned; this repo has no
  PostCSS config.
- No secrets: `REACT_APP_API_URL` comes from each portal's own environment.

## Verifying your change

```bash
npm install   # dependencies for tests only; nothing here is bundled
npm test      # react-scripts test --watchAll=false — 14 suites / 131 tests green at 5446bd2
npm run check # prints a reminder: there is no build step here
```

`npm run check` passing is **not** evidence of correctness. Real verification is
`npm run shared-ui:check` + `npm run build` in each portal after re-pinning.

Conventions: 4-space indent, double quotes, semicolons, `export const`/`export function` named
exports; there is no lint or format config in this repo. Commit messages use Conventional Commits
(`feat(chat): …`, `fix(shared-ui): …`, `test(shared-ui): …`, `chore: …`). Bump `version` in
`package.json` only as a label — reproducibility comes from the pinned SHA.

## Known gaps to keep in mind

- The drift workflows trigger only on the paths listed in their `on.push` / `on.pull_request`
  filters (`tailwind.config.js`, `src/index.css`, `src/api/**`, `src/auth/**`,
  `src/components/ui/**`, `src/context/notificationsContext.js`, `src/hooks/useChatHub.js`,
  `src/utils/utcToRelativeTime.js`, plus `src/components/profile/**` in `doctor-ui` only).
  `src/components/chat/**`, `src/utils/chat.js`, `src/utils/moderationState.js`,
  `src/utils/postComposerConfig.js`, `src/hooks/useModerationStage.js`,
  `src/components/media/**`, `src/components/history/**`, `src/components/routing/**`, and
  `src/theme/**` are **not** in those filters, so a change limited to them does not run the job
  automatically — run `npm run shared-ui:check` locally in both portals, or dispatch the workflow
  manually.
- Both portals' drift workflows now trigger on `master` (patient-ui was realigned from `main`
  during stabilization). Verify with `npm run shared-ui:check` locally regardless.
- `patient-ui/src/components/chat/roomsFilter.test.js` exists and matches upstream but is **not**
  listed in `patient-ui/.shared-ui.json`, so the drift check ignores it. Add it to the manifest or
  delete it rather than letting it drift silently.
- `README.md`'s "What is deliberately not shared" section now correctly lists only
  `CertificateModal`/`QualificationModal` as doctor-only; `ProfileView` is vendored by both portals.
