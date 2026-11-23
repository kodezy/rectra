# Design

How the workspace should look and behave, and where the visual reference lives. Exact copy is in `ui/`; token values are in Penpot and in `ui/index.css`. This document keeps what neither says on its own: intent, meaning, and how to check a screen.

## Sources and precedence

- **Penpot** (`Rectra · UI`) decides appearance: layout, chrome, components, and product copy. The CSS implements those values; a difference is a defect in the code. Appearance changes start in Penpot.
- **[PRODUCT.md](PRODUCT.md)** decides required behavior. A board that contradicts the product is a divergence to report; implementation follows the product.
- **This document** does not copy token values or screen strings. If a value here disagrees with Penpot or the code, those sources win.

## Principles

The workspace is a mapping editor: dark, compact, and exact. The screenshot is the work; chrome stays out of the way.

- **Dark only.** Surfaces, text, and the canvas assume a dark background; there is no light theme.
- **Canvas first.** Explorer, inspector, and toolrail frame the screenshot; they do not compete with it.
- **One primary action in view.** Dialogs confirm; they do not stack.
- **English UI copy**, matching the product vocabulary (anchor, component, placement, map component).

## Color and type

Tokens live in `ui/index.css` (`@theme`). Use those names in components, not raw hex.

| Token | Meaning |
| --- | --- |
| `background`, `surface`, `panel`, `input`, `canvas` | Surfaces, from window to raised chrome and the screenshot well |
| `border`, `row`, `selected` | Dividers and selection |
| `text` / `muted` / `subtle` | Primary / secondary / disabled or hint text |
| `primary` / `on-primary` | Primary action |
| `destructive` | Destructive confirmation only |

Inter for UI text. Icons are Lucide.

## Components

Shared controls live under `ui/shell/`.

- **Buttons:** `primary`, `secondary`, `ghost`, `destructive`. Destructive only for confirmations that delete or discard.
- **Shell:** header, explorer, inspector, toolrail, canvas toolbar, footer. Panel widths and the compact breakpoint live in `ui/shell/layout.ts` (and matching CSS spacing tokens).
- **Dialogs:** one modal at a time. Escape closes the top layer.
- **Canvas overlays:** strokes, handles, and name labels stay consistent across tools.

## Checking a screen

When a screen's appearance changes, check against Penpot `Rectra · UI` (and `penpot-design` / `design-to-code` when those skills are present):

1. Read the board and state boards in Penpot.
2. Implement with existing tokens and shell controls.
3. Exercise the flow in the running app (`npm run tauri dev`), including empty, error, and populated states, and both desktop and compact widths.

A missing board is a gap, not permission to invent. Use existing patterns, note the gap, and ask for the drawing.
