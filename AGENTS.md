# AGENTS.md

Repository map for coding agents. Code and tests are the source of current behavior; the docs keep promises, boundaries, and reasons.

## How to work here

Read the code and tests of the area before changing it, and pick the approach that fits the task. Open a doc only when the task touches its subject. Do not read all documentation before every task.

Code: `core/model` (types, geometry, validation, export mappings), `core/editor` (session reducer, viewport, undo), `core/persistence` (`.rectra` open/save and export), `ui/shell` (explorer, inspector, toolbar, dialogs), `ui/editor` (React context and Konva canvas), `native/` (Tauri window, dialog, filesystem). Tests live in `tests/`.

## Commands

- Bootstrap: `npm install`
- Test: `npm test` · `npm run test:watch`
- Type-check and web build: `npm run build`
- Desktop: `npm run tauri dev` · `npm run tauri build`

Prerequisites, the full command table, CI, and delivery: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Native dialogs need `tauri dev`, not Vite alone.

## Easy to forget

- **`core/model` imports nothing** from `ui`, `core/editor`, or `core/persistence`. `core/editor` imports `core/model`. `core/persistence` imports `core/model` and `EditorState` from `core/editor/reducer`. `ui` does not import the Rust crate in `native/`.
- **Model B:** one placement per `(componentId, anchorId)`; offsets are derived from rects, not stored.
- **One screenshot per screen** (PNG/JPEG). Save and export are different packages. No custom Rust commands.
- **UI copy is English.** Appearance follows Penpot `Rectra · UI`.

## Documents

- [docs/PRODUCT.md](docs/PRODUCT.md): what Rectra promises the mapper, the flows, and the vocabulary.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): modules, boundaries, dependency direction, invariants.
- [docs/DESIGN.md](docs/DESIGN.md): workspace principles, tokens, and how to check a screen against Penpot.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): prerequisites, commands, tests, CI, and delivery.

**When to update:** a doc changes when what it states changes: a product promise, a boundary, a contract, or the reason for a decision. Refactors, UI copy, and new tests do not need a doc change. If a task contradicts `docs/PRODUCT.md`, ask first. Offer doc changes to the user; do not add new topic docs on your own.

## Definition of done

- Behavior matches the task. A change the mapper would notice agrees with [docs/PRODUCT.md](docs/PRODUCT.md). No unrelated edits, dead code, or leftover shims.
- `npm test` passes; `npm run build` when types or the Vite graph change; on a PR, CI is green.
- Integrity review done with the `integrity-review` skill when it is installed; fix scoped leftovers and report the rest.

## Local instructions

- Follow your host's instruction precedence; the user's message in the session always wins. No nested `AGENTS.md`.
- Agents may commit, push a branch, and open or update its PR. Merging, deleting remote branches, and changing `main` directly need an explicit request. Commit style: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#delivery).
- Local scratch stays out of git: `docs/superpowers/`, `.superpowers/`, `.worktrees/`, and harness folders (`.claude/`, `.cursor/`, `.agents/`).
- Use a project skill when it is already installed and the task fits. `integrity-review` before claiming done, and `git-commit` when committing, are the usual ones. Appearance work: `penpot-design` / `design-to-code` against Penpot `Rectra · UI` when those skills are present.
