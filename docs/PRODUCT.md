# Product

What Rectra promises the person who maps screens: who it serves, the flows, and the rules that person can see. How each rule is implemented lives in code and tests; this document changes when a promise changes.

## Who and why

Rectra is a desktop editor for mapping logical UI components onto screenshot regions defined by anchors. It serves someone who has screenshots of an interface and needs a reusable map of those regions, not a general drawing tool.

The hard part is not drawing one box. It is keeping the same logical component aligned across similar layouts, without treating the screenshot as the component, and without mixing a saved project with an export package.

## Principles

1. **Anchors first.** Components exist only after the project has at least one anchor. Mapping happens on the active anchor.
2. **The component is logical.** A component is reused across anchors; a new placement keeps the existing offset instead of becoming a second independent box.
3. **One screenshot per screen.** Each screen holds a single PNG or JPEG. Replacing it is allowed only when the new image has the same dimensions.
4. **Save and export are different.** A `.rectra` folder is the project. An export folder is `mappings.json` plus template PNGs, and it cannot be opened as a project.
5. **The app stays on the desktop.** No accounts, backend, plugins, or telemetry. There is no Save As.

## Flows

1. **New** creates a project in memory.
2. Add a screen and import a PNG or JPEG.
3. Draw at least one **Anchor** (`A`).
4. Map **Components** (`C`) on the active anchor.
5. To reuse a component on another anchor, use **Map component**. The new placement keeps the existing offset.
6. **Save** asks for a parent folder the first time and writes `<name>.rectra/` (`project.json` and `assets/`). Later saves update that folder.
7. **Export** writes `mappings.json` and one PNG per anchor into an empty folder or an export folder the app already manages. It stays disabled until the project has an anchor.

## Rules the mapper sees

**Active anchor.** Placements are shown and edited for the selected anchor, or the first anchor on the current screen.

**Deleting an anchor** removes that placement from every component.

**Undo** does not restore deleted asset files on disk.

**Export** only into an empty folder or a folder the app already manages (`mappings.json` and `templates/`).

**Shortcuts.** File actions (`Ctrl/Cmd+N`, `O`, `S`, `E`) still run while an input, textarea, or select is focused. They do not run while a dialog is open. Canvas shortcuts do not run in either case. The component tool requires an active anchor.

**Language.** UI copy is English.

## Vocabulary

| Term | Meaning |
| --- | --- |
| **Project** | Named document of screens, saved as a `.rectra` folder. |
| **Screen** | Named screenshot plus its anchors and logical components. |
| **Anchor** | Rectangle on one screen; at least one is required before components. |
| **Component** | Logical `coord` or `bbox`, with placements keyed by anchor. |
| **Placement** | One rectangle of a component on a given anchor. |
| **Map component** | Place an existing component on another anchor, keeping the offset. |
| **`.rectra`** | Saved package: `project.json` + `assets/`. |
| **Export** | `mappings.json` + `templates/` PNGs in a managed output folder. |
