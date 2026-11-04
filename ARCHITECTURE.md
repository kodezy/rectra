# Architecture

Rectra is a desktop editor (Tauri 2 + React/TypeScript/Vite) that maps UI components onto screenshots. Domain logic lives in TypeScript. The Rust crate is the Tauri shell: window, dialog, and filesystem plugins. No HTTP, database, or custom IPC commands.

## Vocabulary

| Term | Meaning |
| --- | --- |
| Project | `formatVersion: 1` document: id, name, screens |
| Screen | Named screenshot plus anchors and logical components |
| Anchor | Rectangle on one screen; at least one required before components |
| Component | Logical `coord` or `bbox`; placements keyed by `anchorId` |
| Placement | One rectangle of a component on a given anchor |
| Model B | Offsets derived at read/export from `placement.rect` vs `anchor.rect` |
| `.rectra` | Saved package: `project.json` + `assets/` |
| Export | `mappings.json` + `templates/` PNGs into a managed output folder |

## Layout

```
src/model/           types, geometry, names, validate, export mappings
src/editor/          session reducer, undo snapshots, Konva canvas
src/app/             workspace shell (Explorer, Inspector, toolbar, dialogs)
src/persistence/     open/save `.rectra`, export package, path helpers
src-tauri/           Tauri 2 window + dialog/fs/opener plugins
tests/               Vitest: model, reducer, saveLogic, layout
docs/product/        product spec (behavior)
```

Dependency direction: `model` has no imports from `app`, `editor`, or `persistence`. `editor` imports `model`. `persistence` imports `model` and `EditorState` from `editor/reducer`. `app` imports all three.

## Runtime

- Vite UI on port 1420 (`strictPort`); Tauri `beforeDevCommand` is `npm run dev`.
- Session state: `{ project, screenImages, selection, tool, view }` plus undo/redo of `{ project, screenImages }`.
- Screenshots stay in memory (`Uint8Array` + `pendingWrite`) until Save writes assets.
- Persistence uses `@tauri-apps/plugin-fs` and `@tauri-apps/plugin-dialog`. Save is transactional (temp dir then replace).
- Appearance: Tailwind tokens `rectra.dark`; visual source is Penpot file `Rectra · UI`. Behavior source is `docs/product/rectra_product_spec_v0_4.md`.
- Compact layout when window width `< 1280` (explorer 208, inspector 256 vs 240/296).

## Invariants

- One screenshot per screen; PNG/JPEG only.
- Components exist only after the project has at least one anchor.
- Active-anchor editing: placements shown/edited for the selected or first anchor on the current screen.
- Deleting an anchor removes that placement from every component.
- Undo does not restore deleted asset files on disk.
- Export refuses folders it does not manage (`mappings.json` + `templates/`).
- UI copy is English.

## Limits

- No product plugins, telemetry, multi-screenshot-per-screen, snap/grid, or Save As.
- `src-tauri/src/lib.rs` registers dialog, fs, and opener; no domain commands. Opener is unused from the UI.
- No CI workflow in this repo.

## Commands

From `package.json` / `src-tauri/tauri.conf.json`:

```
npm install
npm test              # vitest run (tests/**/*.spec.ts)
npm run test:watch
npm run build         # tsc && vite build → dist/
npm run dev           # Vite only
npm run tauri dev     # desktop app
npm run tauri build
```

Icon set: `npx tauri icon src-tauri/app-icon.svg` writes `src-tauri/icons/`. Dock on macOS follows a rebuilt `src-tauri/target/debug/rectra`, not the Vite HMR session.
