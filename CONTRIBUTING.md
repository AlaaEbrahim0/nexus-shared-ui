# Contributing to `@nexus/shared-ui`

This repo is the **canonical source** for the shared design tokens, shared components, and shared
auth/session/API client used by the two Nexus portals (`patient-ui`, `doctor-ui`). It is not an npm
package: portals **copy** the files they need at a pinned commit. Read `AGENTS.md` first — it
explains the model and the token system; this file is the procedure.

The project is in **feature freeze**. Land only fixes and integration work here; anything that adds
behaviour needs to be agreed before you touch it.

## The one rule

Fix shared code **here**, then re-pin both portals. Never edit the vendored copies inside a portal —
they are overwritten by the next sync and flagged as drift by `shared-ui:check`.

## Working in this repo

```bash
npm install   # dev deps used by the test run only
npm test      # react-scripts test --watchAll=false
npm run check # prints a note: there is no build step here
```

There is no bundler, no `dist/`, and no publish script — do not add one. Style follows the existing
files: 4-space indent, double quotes, semicolons, named `export const` / `export function`. No lint
or format config lives here.

## Landing a change (the full loop)

1. **Edit here.** Design-token changes go in `tailwind.config.js` and/or `src/index.css`;
   component changes in `src/components/**`; shared plumbing in `src/api`, `src/auth`,
   `src/context`, `src/hooks`, `src/theme`, `src/utils`.
2. **Test here.** `npm test`. Add or update a `*.test.js` alongside the file when the fix is
   behavioural.
3. **Commit** with Conventional Commits (`fix(chat): …`, `feat(shared-ui): …`, `chore: …`)
   and **push to `master`**. Push first: a portal can only pin a SHA that exists on GitHub
   (the sync clones `manifest.repo` when the local `../shared-ui` checkout is not on the pinned ref).
4. **Re-pin + sync in each portal:**

   ```bash
   # in patient-ui, then again in doctor-ui
   npm run shared-ui:sync -- --ref <new-sha>   # writes .shared-ui.json, then copies the files in
   npm run shared-ui:check                      # must be silent-in-sync (exit 0)
   npm run build                                # the real correctness gate
   npm test
   ```

   Equivalent to the `--ref` flag: edit `ref` in `.shared-ui.json` by hand, then run
   `npm run shared-ui:sync`. `version` in that file is a label only — the script ignores it.
5. **Commit the portal change** — the re-pinned `.shared-ui.json` **together with** the synced
   files, in the same commit — then redeploy. Neither portal's Vercel project is connected to
   GitHub, so pushing does **not** build anything: production is deployed from the CLI with
   `npx vercel --prod` from the portal directory.
6. **Both portals must end up on the same SHA.** A half-applied pin means the patient and doctor
   views diverge on exactly the shared surface meant to prevent that. Pin `5446bd2` today:
   `patient-ui` 48 files, `doctor-ui` 54, both `In sync`.

## Changing the vendored set

**Add a file:** create it in this repo at the mirrored path → push → add that exact relative path to
`files` in each portal's `.shared-ui.json` (the list is explicit; no globs) → run the loop above.

**Delete or rename a file:** remove/rename it here, remove the old path from both manifests,
re-pin and sync, then **delete the leftover copy in each portal by hand** — the sync only writes
files, it never removes them. Leaving the manifest entry behind also fails the run with
`missing upstream`.

**Add a third-party import to a shared file:** install that package in **both** portals and add it
to `peerDependencies` here *before* re-pinning, or the portal missing it fails its build. If only
one portal vendors the file that needs it, mark it optional in `peerDependenciesMeta` (as
`formik`, `yup`, and `moment` already are) and record which portal uses it in `README.md`.

## Token changes specifically

- `neutral` / `slate` and `ink`, `muted`, `line`, `canvas`, `surface` are declared in
  `tailwind.config.js` as `rgb(var(--token) / <alpha-value>)`, so those utilities resolve to the
  hand-written RGB triplets in `src/index.css`. `brand`/`success`/`warning`/`danger`/`info` and the
  DaisyUI `nexus` + `dark` themes come from the `palette` object literal. A colour change normally
  needs `tailwind.config.js` **and** `src/index.css` edited in step — update both, then diff the
  rendered result in each portal.
- Use the semantic tokens rather than raw hex or light-only tints. If you add a light-tinted class,
  add the matching `html[data-theme="dark"] …` override in the theme-bridge section of
  `src/index.css`, otherwise the fix lands light mode only.
- `tailwind.config.js` and `src/index.css` are vendored by both portals; never fork them per portal.

## The CRA / Jest ESM rule

`src/components/ui/index.js` must stay dependency-light. Create React App's Jest config does not
transform `node_modules` and cannot be extended without ejecting, so re-exporting anything that
imports an ESM-only package (`react-markdown`, …) from that barrel makes **every** test that
imports `"../ui"` fail with `SyntaxError: Unexpected token 'export'`. Put such components in
`src/components/ui/community.js` (the explicit opt-in entry) or in their own module — which is why
the chat components, `src/api/chat.api.js`, and `src/utils/chat.js` are imported by direct path and
have no barrel.

## CI and how drift is caught

Each portal has `.github/workflows/shared-ui-drift.yml`, which installs nothing and runs
`npm run shared-ui:check`. Two caveats verified in those files:

- The trigger `paths:` filters cover `tailwind.config.js`, `src/index.css`, `src/api/**`,
  `src/auth/**`, `src/components/ui/**`, `src/context/notificationsContext.js`,
  `src/hooks/useChatHub.js`, `src/utils/utcToRelativeTime.js` (and `src/components/profile/**` in
  `doctor-ui` only). They do **not** list `src/components/chat/**`, `src/utils/chat.js`,
  `src/utils/moderationState.js`, `src/utils/postComposerConfig.js`,
  `src/hooks/useModerationStage.js`, `src/components/media|history|routing/**`, or `src/theme/**`,
  so a change limited to those paths will not start the job: run `npm run shared-ui:check` locally
  in both portals (or use `workflow_dispatch`).
- Both portals' drift workflows trigger on `master` (patient-ui was realigned from `main` during
  stabilization); confirm the branch filter matches where you actually push.

## Pull-request / commit etiquette

- One shared concern per commit; say in the message which portals need re-pinning.
- Bump `version` in `package.json` only when the change deserves a release label — the pin is the
  SHA, and that is what guarantees reproducibility.
- Update `CHANGELOG.md` for anything user-visible, and update `README.md`'s shared/not-shared tables
  when the vendored set changes.
- Never vendor portal pages, navigation, domain rules, authorisation, pricing, or secrets
  (`REACT_APP_API_URL` belongs to each portal's environment).
