#!/usr/bin/env node
// Vendors @nexus/shared-ui files into this portal at the commit pinned in .shared-ui.json.
// CRA transpiles JSX only under the app's own src/, so the shared sources are copied in at
// their pinned git ref rather than imported from node_modules.
//
//   node scripts/shared-ui-sync.mjs                  copy upstream files in
//   node scripts/shared-ui-sync.mjs check            exit 1 if this portal has drifted
//   node scripts/shared-ui-sync.mjs --ref <sha>      bump the pin, then copy files in
//
// A checkout of nexus-shared-ui sitting next to this portal is used when it is already at
// the pinned ref; otherwise the pinned ref is cloned from GitHub, so CI never needs a
// developer-local path.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const portalRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const checkOnly = argv.includes("check");
const forceClone = argv.includes("--clone");

const manifestPath = path.join(portalRoot, ".shared-ui.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const refFlag = argv.indexOf("--ref");
if (refFlag !== -1) {
  const nextRef = argv[refFlag + 1];
  if (!/^[0-9a-f]{7,40}$/.test(nextRef || "")) {
    console.error("--ref expects a commit sha.");
    process.exit(1);
  }
  manifest.ref = nextRef;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Pinned @nexus/shared-ui to ${nextRef}`);
}

function readGitRev(dir) {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function acquireSource() {
  const neighbour = path.resolve(portalRoot, "..", "shared-ui");
  if (!forceClone && readGitRev(neighbour) === manifest.ref) {
    return { dir: neighbour, cleanup: null };
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-shared-ui-"));
  execFileSync("git", ["clone", "--quiet", manifest.repo, dir]);
  execFileSync("git", ["-C", dir, "checkout", "--quiet", manifest.ref]);
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

const { dir: source, cleanup } = acquireSource();
let drifted = 0;
let missing = 0;

for (const rel of manifest.files) {
  const upstream = path.join(source, rel);
  const vendored = path.join(portalRoot, rel);

  if (!fs.existsSync(upstream)) {
    console.error(`  missing upstream   ${rel}`);
    missing += 1;
    continue;
  }
  if (fs.readFileSync(upstream).equals(fs.existsSync(vendored) ? fs.readFileSync(vendored) : Buffer.alloc(0))) {
    continue;
  }

  drifted += 1;
  if (checkOnly) {
    console.error(`  drifted            ${rel}`);
  } else {
    fs.mkdirSync(path.dirname(vendored), { recursive: true });
    fs.copyFileSync(upstream, vendored);
    console.log(`  updated            ${rel}`);
  }
}

cleanup?.();

const label = `@nexus/shared-ui@${manifest.ref.slice(0, 7)}`;
if (missing) {
  console.error(`\n${missing} file(s) listed in .shared-ui.json do not exist in ${label}.`);
  process.exit(1);
}
if (drifted) {
  console.error(
    checkOnly
      ? `\n${drifted} file(s) in this portal differ from ${label}. Run: npm run shared-ui:sync`
      : `\nSynced ${drifted} file(s) from ${label}.`
  );
  process.exit(checkOnly ? 1 : 0);
}
console.log(`In sync with ${label} (${manifest.files.length} files).`);
