<p align="center">
  <img src="assets/banner.png" alt="Rectra" width="520" />
</p>

<p align="center">
  Desktop editor for mapping logical UI components onto screenshot regions defined by anchors.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-24C8DB?logo=tauri&logoColor=white" alt="Tauri">
  <img src="https://img.shields.io/badge/React-20232a?logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-0F172A?logo=tailwindcss&logoColor=38BDF8" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Konva-0D83CD" alt="Konva">
</p>

## Preview

<p align="center">
  <img src="assets/rectra-editor.png" alt="Rectra workspace with explorer, screenshot canvas, and inspector" width="720" />
</p>

## Setup

Install **Node.js 22** with **npm**, plus **Rust** [edition 2024](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) (1.85+) and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
npm install
```

## Usage

```bash
npm run tauri dev
```

Create a project, import PNG or JPEG screens, draw anchors, map components, then **Save** (`.rectra`) or **Export** (`mappings.json` and `templates/`). **Map component** reuses an existing component and keeps its offset. There is no Save As; an export folder is not a project.

The full mapping path, shortcuts, and limits: [Product](docs/PRODUCT.md).

## Architecture

```text
core/     mapping logic (no React)
ui/       workspace and Konva canvas
native/   Tauri window, dialogs, filesystem
```

Boundaries: [Architecture](docs/ARCHITECTURE.md).

## Development

```bash
npm test
npm run build
```

`npm test` runs Vitest. `npm run build` runs `tsc` and Vite into `dist/`. Native file dialogs need `npm run tauri dev`, not `npm run dev` alone.

CI, the rest of the commands, and how a change reaches `main`: [Development](docs/DEVELOPMENT.md).

## Docs

- [Product](docs/PRODUCT.md) — what the editor promises, the flows, and the vocabulary
- [Design](docs/DESIGN.md) — workspace principles and Penpot `Rectra · UI`
- [Architecture](docs/ARCHITECTURE.md) — modules, boundaries, and invariants
- [Development](docs/DEVELOPMENT.md) — commands, tests, and delivery
- [AGENTS.md](AGENTS.md) — map for coding agents
