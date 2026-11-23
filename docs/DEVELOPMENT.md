# Development

How to set up a machine, run checks, and land a change on `main`. What agents may do on their own, and the definition of done, are in [AGENTS.md](../AGENTS.md). Promises are in [PRODUCT.md](PRODUCT.md). Appearance is in [DESIGN.md](DESIGN.md). First run for a mapper is in [README.md](../README.md).

## Prerequisites

Node 22 with npm, plus **Rust** [edition 2024](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) (1.85+) and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for the OS.

```bash
npm install
```

`npm run tauri` runs the CLI at the repo root and loads `native/` (the only `tauri.conf.json`).

## Commands

| Command | What it does |
| --- | --- |
| `npm test` | Vitest (`tests/**/*.spec.ts`) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run build` | `tsc` and Vite into `dist/` |
| `npm run dev` | Vite only, port 1420 (`strictPort`) |
| `npm run tauri dev` | Desktop app (native dialogs need this, not Vite alone) |
| `npm run tauri build` | Packaged app |

There is no ESLint in this repo.

CI (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `main`: `npm test`, then `npm run build`.

Icon set: `npx tauri icon native/app-icon.svg` writes `native/icons/`. Dock on macOS follows a rebuilt `native/target/debug/rectra`, not the Vite HMR session.

## Tests

Tests live in `tests/` as Vitest specs. Run the files tied to the change.

## Delivery

Work lands on `main` through a pull request. CI runs on that PR.

Recent commits are imperative, sentence case, and end with a period. Match that when it fits the change.

Local agent scratch stays out of git: `docs/superpowers/`, `.superpowers/`, `.worktrees/`, and the harness folders listed in `.gitignore` (`.claude/`, `.cursor/`, `.agents/`, `.brantz-lock.json`).
