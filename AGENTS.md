# Rectra

Desktop screenshot-to-component mapper. Stack: Tauri 2, React 19, TypeScript, Vite, Tailwind 4, Konva. Spec: `docs/product/rectra_product_spec_v0_4.md`. Appearance: Penpot `Rectra · UI`. Map: [ARCHITECTURE.md](ARCHITECTURE.md).

## Commands

```
npm install
npm test
npm run build
npm run tauri dev
```

`npm run tauri build` packages the app. Tests: Vitest, `tests/**/*.spec.ts`. No ESLint/CI in-repo.

## Core invariants

- **Model B:** logical components; one placement per `(componentId, anchorId)`; offsets derived from rects, not stored.
- Domain stays in `core/model`. Do not add HTTP, Python, OpenCV, a database, Zustand, Zod, custom Rust commands, plugins, or telemetry.
- One screenshot per screen (PNG/JPEG). No snap, grid, or Save As.
- UI copy English. Product spec is behavior; Penpot is pixels/layout.
- `core/model` must not import `ui`, `core/editor`, or `core/persistence`.

## Context routing

- Architecture and module boundaries → [ARCHITECTURE.md](ARCHITECTURE.md)
- Product behavior, file format, shortcuts → `docs/product/rectra_product_spec_v0_4.md`
- Types and geometry → `core/model/`
- Session edits / undo → `core/editor/reducer.ts`
- Canvas → `ui/editor/canvas/EditorCanvas.tsx`
- Shell (explorer, inspector, dialogs) → `ui/shell/`
- `.rectra` save/open and export → `core/persistence/`
- Tauri window and plugins → `native/` (capabilities in `native/capabilities/default.json`)
- Tests → `tests/*.spec.ts`

When the task is about **skills, AGENTS.md, MCP, or how coding agents are set up in this repo**, read `~/.agents/skills/coding-agent-landscape/SKILL.md` first (catalog: how agents, skills, and harnesses work). Follow that skill; do not dump research into this file.

## Local instructions

User chat overrides this file. No nested `AGENTS.md`.
