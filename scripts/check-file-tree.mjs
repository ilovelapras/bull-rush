#!/usr/bin/env node
// Checks that the file tree in CLAUDE.md §4.1 matches the real repository (rule R9).
//
//   node scripts/check-file-tree.mjs                run by hand / in CI / pre-push (exit 1 on mismatch)
//   node scripts/check-file-tree.mjs --claude-hook  run as a Claude Code Stop hook (exit 2 blocks the stop)
//
// Tree format: 2-space indentation, one entry per line, folders end in "/", `(planned)` marks
// entries that don't exist yet, and `//` starts a comment. Lines that only hold a comment are
// continuations of the previous entry's comment.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const claudeHook = process.argv.includes("--claude-hook");

// Not listed in the tree: generated, vendored, or housekeeping files.
const IGNORED_NAMES = new Set([
  "node_modules",
  "dist",
  ".git",
  ".vite",
  "coverage",
  ".DS_Store",
  ".gitkeep",
  "pnpm-lock.yaml",
]);

function fail(message) {
  console.error(message);
  process.exit(claudeHook ? 2 : 1);
}

async function readStdinJson() {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/** Parses the fenced tree block under "### 4.1" into [{ path, isDir, planned }]. */
export function parseTree(markdown) {
  const section = markdown.split(/^### 4\.1 /m)[1];
  if (!section) throw new Error("CLAUDE.md has no '### 4.1' section");
  const block = /```\n([\s\S]*?)\n```/.exec(section);
  if (!block) throw new Error("CLAUDE.md §4.1 has no fenced tree block");

  const entries = [];
  const stack = []; // [{ indent, name }]
  for (const raw of block[1].split("\n")) {
    if (/^\s*\/\//.test(raw) || raw.trim() === "") continue; // comment-only continuation line
    const indent = raw.length - raw.trimStart().length;
    const planned = /\(planned\)/.test(raw);
    const name = raw.trim().split(/\s+/)[0];
    const isDir = name.endsWith("/");
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parts = [...stack.map((s) => s.name), name.replace(/\/$/, "")];
    entries.push({ path: parts.join("/"), isDir, planned });
    if (isDir) stack.push({ indent, name: name.replace(/\/$/, "") });
  }
  // The first entry is the repository root folder (e.g. "bull-rush/"); strip it.
  const rootName = entries[0].path;
  return entries.slice(1).map((e) => ({ ...e, path: e.path.slice(rootName.length + 1) }));
}

function walk(dir) {
  const out = [];
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_NAMES.has(dirent.name)) continue;
    const full = join(dir, dirent.name);
    const rel = relative(root, full).split(sep).join("/");
    if (dirent.isDirectory()) {
      out.push({ path: rel, isDir: true });
      out.push(...walk(full));
    } else {
      out.push({ path: rel, isDir: false });
    }
  }
  return out;
}

// pathToFileURL, not a `file://` template: on Windows argv[1] has backslashes and a drive letter,
// and paths with spaces are percent-encoded in import.meta.url.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (claudeHook) {
    const input = await readStdinJson();
    // Already blocked once this turn: don't trap the agent in a loop.
    if (input.stop_hook_active) process.exit(0);
  }

  const tree = parseTree(readFileSync(join(root, "CLAUDE.md"), "utf8"));
  const real = walk(root);
  const realPaths = new Set(real.map((e) => e.path));
  const treePaths = new Set(tree.map((e) => e.path));
  const problems = [];

  for (const e of tree) {
    const exists = existsSync(join(root, e.path));
    if (e.planned && exists) problems.push(`exists but still marked (planned): ${e.path}`);
    if (!e.planned && !exists) problems.push(`listed in the tree but missing: ${e.path}`);
  }
  for (const e of real) {
    if (!treePaths.has(e.path)) problems.push(`exists but not in the tree: ${e.path}`);
  }

  if (problems.length > 0) {
    fail(
      "The file tree in CLAUDE.md §4.1 doesn't match the repository (rule R9). Fix the tree:\n" +
        problems.map((p) => `  - ${p}`).join("\n"),
    );
  }
  console.log(`File tree OK (${tree.length} entries, ${realPaths.size} real paths).`);
}
