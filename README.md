# Rectra

Desktop editor that maps UI components onto screenshots and exports relative coordinates plus PNG templates. It does not capture windows, run automations, or detect objects.

Rectra is a Tauri 2 app (React 19, TypeScript, Vite, Tailwind 4, Konva). Version `0.1.0`. UI copy is English.

## Features

- Local project: New, Open, Save, rename, close, with session undo/redo.
- Screens with exactly one PNG or JPEG screenshot each (import, replace only when dimensions match).
- Anchors drawn on the screenshot; logical components (`coord` or `bbox`) with one placement per `(component, anchor)`.
- Offsets are derived from rectangles, not stored in the project.
- Canvas tools: Select, Anchor, Component, Pan, overlays, zoom 50–200%, Fit.
- Save as a `.rectra` folder (`project.json` + `assets/`). Export as `mappings.json` + `templates/` PNGs into a managed folder.

## Installation

You need **Node.js** with **npm**, and a **Rust** toolchain that supports [edition 2024](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) (Rust 1.85 or newer). Also install the [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
npm install
```

## Usage

Run the desktop app:

```bash
npm run tauri dev
```

Typical flow:

1. **New** — create a project in memory.
2. Add a screen and import a PNG or JPEG.
3. Draw at least one **Anchor** (`A`), then map **Components** (`C`) on the active anchor. Map the same logical component onto other anchors when the layout needs different placements.
4. **Save** — first save picks a parent folder and writes `<name>.rectra/`. Later saves write back to that folder. There is no Save As.
5. **Export** — writes `mappings.json` and one PNG crop per anchor. Export is disabled until the project has an anchor. Open does not load an export package as a project.

Package a release build:

```bash
npm run tauri build
```

### Shortcuts

| Action | Key |
| --- | --- |
| Select / Anchor / Component | `V` / `A` / `C` |
| Pan | Space (hold) or Pan tool |
| Fit | `F` |
| New / Open / Save / Export | `Ctrl/Cmd+N` / `O` / `S` / `E` |
| Undo / Redo | `Ctrl/Cmd+Z` / `Ctrl/Cmd+Shift+Z` |
| Delete selection | `Delete` / `Backspace` |
| Cancel drawing or dialog | `Esc` |

Canvas shortcuts do not fire while an input, textarea, select, or dialog is focused. File chords work with a focused field. Component is disabled until an anchor is selected.

## Development

```bash
npm test              # Vitest (`tests/**/*.spec.ts`)
npm run test:watch
npm run build         # `tsc` and Vite → `dist/`
npm run dev           # Vite UI only (port 1420); file dialogs need the Tauri app
```

There is no ESLint or CI workflow in this repo. VS Code recommendations: Tauri and rust-analyzer (see `.vscode/extensions.json`).

Behavior: [`docs/product/rectra_product_spec_v0_4.md`](docs/product/rectra_product_spec_v0_4.md). Module layout (`ui/`, `core/`, `native/`): [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Limitations

- One screenshot per screen; PNG/JPEG only.
- No snap, grid, multi-select, Save As, plugins, network, or telemetry.
- Undo does not restore deleted files on disk.
- Export refuses folders it does not manage (`mappings.json` + `templates/`).
