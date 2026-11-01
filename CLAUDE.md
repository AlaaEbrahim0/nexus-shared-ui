# CLAUDE.md

Start with [`AGENTS.md`](AGENTS.md) in this directory — it is the authoritative guide for this repo:
what `@nexus/shared-ui` is (the canonical, **vendored** source of shared design tokens, shared
components, and the shared auth/session/API client for the `patient-ui` and `doctor-ui` portals —
not an npm package, no build or publish step), how each portal pins it via `.shared-ui.json` +
`scripts/shared-ui-sync.mjs`, the rule that every shared token/component fix lands **here** and is
then re-pinned into both portals (never in a portal's vendored copy, and both portals must end up on
the same SHA), how to add or remove a file from the vendored set, and the Create React App / Jest
constraint that keeps `react-markdown` out of `src/components/ui/index.js`.
[`CONTRIBUTING.md`](CONTRIBUTING.md) has the step-by-step command workflow,
[`CHANGELOG.md`](CHANGELOG.md) the release history, and [`README.md`](README.md) the wider
architecture picture.
