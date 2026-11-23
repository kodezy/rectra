# Architecture

How Rectra delivers [PRODUCT.md](PRODUCT.md): modules, boundaries, dependency direction, and the reasons behind the choices that matter. This document does not add or remove requirements. Appearance is in [DESIGN.md](DESIGN.md). Commands are in [DEVELOPMENT.md](DEVELOPMENT.md).

## Goals

What the principles in [PRODUCT.md](PRODUCT.md) force in the tree:

1. **Logic stays out of the shell.** Mapping rules live in TypeScript `core/`. `native/` is window, dialog, and filesystem only.
2. **Offsets are derived.** Model B: one placement per `(componentId, anchorId)`; offsets come from `placement.rect` vs `anchor.rect`, and are not stored.
3. **The project file is not the export.** Persistence writes `.rectra`; export writes a managed `mappings.json` + `templates/` folder.
4. **No extra runtime.** One desktop process. No HTTP API, database, custom IPC commands, or product plugins.

## Layout

```
core/model/            types, geometry, names, validate, export mappings
core/editor/           session reducer, viewport math, undo snapshots
core/persistence/      open/save `.rectra`, export package, path helpers
ui/shell/              workspace (Explorer, Inspector, toolbar, dialogs)
ui/editor/             React context + Konva canvas
native/                Tauri 2 window + dialog/fs plugins
tests/                 Vitest
```

Import aliases (tsconfig + Vite): `@core/*`, `@ui/*`.

## Boundaries

| Module | Owns | Does not own |
| --- | --- | --- |
| `core/model` | Types, geometry, names, validation, export mapping shape | React, session undo, filesystem |
| `core/editor` | Session reducer, viewport, undo snapshots of `{ project, screenImages }` | Dialogs, Tauri plugins |
| `core/persistence` | Open/save `.rectra`, export package, path helpers | Canvas, chrome |
| `ui` | Workspace chrome and Konva canvas | Mapping rules, the Rust crate |
| `native` | Tauri window; `plugin-dialog` and `plugin-fs` | Domain IPC |

## Dependency direction

Allowed:

```
core/model  ←  core/editor, core/persistence, ui
core/editor ←  core/persistence, ui
core       ←  ui
```

Forbidden:

- `core/model` importing `ui`, `core/editor`, or `core/persistence`
- `ui` importing the Rust crate under `native/`
- Domain logic in `native/` (no custom Tauri commands)

## Runtime

- Vite UI on port 1420 (`strictPort`); Tauri `beforeDevCommand` is `npm run dev`.
- Session state: `{ project, screenImages, selection, tool, view }` plus undo/redo of `{ project, screenImages }`.
- Screenshots stay in memory (`Uint8Array` + `pendingWrite`) until Save writes assets.
- Open, save, and export go through `core/persistence` (`plugin-fs` / `plugin-dialog`). Save is transactional (temp dir then replace). The workspace may read image bytes to show them.

## Invariants

- `formatVersion` is `1`.
- One screenshot per screen; PNG/JPEG only.
- Components exist only after the project has at least one anchor.
- Active-anchor editing: placements shown/edited for the selected or first anchor on the current screen.
- Deleting an anchor removes that placement from every component.
- Undo does not restore deleted asset files on disk.
- Export refuses folders it does not manage (`mappings.json` + `templates/`).

## Commitments and internal design

Commitments: the goals and boundaries above, the dependency direction, the invariants, Model B, and the `.rectra` / export packages.

Internal design, free to change while those hold: file and module names inside a layer, how a reducer or dialog is split, viewport numbers, and which test file covers a case. Once code exists, it is the source for that design. A number that only the code names is not a second contract.

## Verification

CI and commands: [DEVELOPMENT.md](DEVELOPMENT.md).
