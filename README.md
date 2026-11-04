<p align="center">
  <img src="assets/rectra-identity-dark.png" alt="Rectra" width="320" />
</p>

# Rectra

Desktop editor that maps UI components onto screenshots and exports relative coordinates plus PNG templates.

Tauri 2, React, TypeScript, Vite, and Konva.

## Preview

<p align="center">
  <img src="assets/rectra-editor.png" alt="Rectra workspace with explorer, screenshot canvas, and inspector" width="720" />
</p>

## Setup

Install **Node.js** with **npm**, plus **Rust** [edition 2024](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) (1.85+) and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
npm install
```

## Usage

```bash
npm run tauri dev
```

1. **New** creates a project in memory.
2. Add a screen and import a PNG or JPEG.
3. Draw at least one **Anchor** (`A`).
4. Map **Components** (`C`) on the active anchor.
5. To reuse a component on another anchor, use **Map component**. The new placement keeps the existing offset.
6. **Save** asks for a parent folder the first time and writes `<name>.rectra/` (`project.json` and `assets/`). Later saves update that folder.
7. **Export** writes `mappings.json` and one PNG per anchor into an empty folder or an export folder the app already manages. It stays disabled until the project has an anchor.

There is no Save As. Export packages cannot be opened as projects.

File shortcuts (`Ctrl/Cmd+N`, `O`, `S`, `E`) still run while an input, textarea, or select is focused. They do not run while a dialog is open. Canvas shortcuts do not run in either case. The component tool requires an active anchor.

## Development

```bash
npm test
npm run test:watch
npm run build
npm run tauri build
```

`npm test` runs Vitest (`tests/**/*.spec.ts`). `npm run build` runs `tsc` and Vite into `dist/`.

`npm run dev` starts Vite on port 1420. Native file dialogs need `npm run tauri dev`.

CI (`.github/workflows/ci.yml`) runs `npm test` and `npm run build` on push to `main` and on pull requests. No ESLint.

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — modules, vocabulary, and boundaries

## Limitations

- One screenshot per screen (PNG/JPEG). Replace only when the new image has the same dimensions.
- No snap, grid, multi-select, Save As, plugins, network, or telemetry.
- Undo does not restore deleted files on disk.
- Export only into empty folders or folders the app manages (`mappings.json` and `templates/`).
- UI copy is English.
