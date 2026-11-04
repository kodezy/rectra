<p align="center">
  <img src="assets/rectra-identity-dark.png" alt="Rectra" width="320" />
</p>

# Rectra

Desktop editor that maps UI components onto screenshots and exports relative coordinates plus PNG templates. It does not capture windows, run automations, or detect objects.

Logical components (`coord` or `bbox`) are shared across anchors on a screen, with one placement per `(component, anchor)`. Offsets are derived from rectangles, not stored. Stack: Tauri 2, React 19, TypeScript, Vite, Tailwind 4, Konva. UI copy is English.

## Setup

You need **Node.js** with **npm**, and a **Rust** toolchain that supports [edition 2024](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) (Rust 1.85 or newer). Also install the [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
npm install
```

## Usage

```bash
npm run tauri dev
```

1. **New** — create a project in memory.
2. Add a screen and import a PNG or JPEG.
3. Draw at least one **Anchor** (`A`), then map **Components** (`C`) on the active anchor. Map the same logical component onto other anchors when the layout needs different placements.
4. **Save** — first save picks a parent folder and writes `<name>.rectra/` (`project.json` + `assets/`). Later saves write back to that folder. There is no Save As.
5. **Export** — writes `mappings.json` and one PNG crop per anchor into a managed folder. Export is disabled until the project has an anchor. Open does not load an export package as a project.

Release build:

```bash
npm run tauri build
```

Canvas shortcuts (`V` / `A` / `C`, Fit, pan) do not fire while an input, textarea, select, or dialog is focused. File chords (`Ctrl/Cmd+N`, `O`, `S`, `E`) still work with a focused field. Component is disabled until an anchor is selected.

## Development

```bash
npm test              # Vitest (`tests/**/*.spec.ts`)
npm run test:watch
npm run build         # `tsc` and Vite → `dist/`
npm run dev           # Vite UI only (port 1420); file dialogs need the Tauri app
```

There is no ESLint or CI workflow in this repo.

## Docs

- Module layout and boundaries: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Product behavior and UI copy: Penpot file `Rectra · UI`

## Limitations

- One screenshot per screen; PNG/JPEG only. Replace is allowed only when dimensions match.
- No snap, grid, multi-select, Save As, plugins, network, or telemetry.
- Undo does not restore deleted files on disk.
- Export refuses folders it does not manage (`mappings.json` + `templates/`).
