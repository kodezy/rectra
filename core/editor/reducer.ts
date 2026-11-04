import type {
  Anchor,
  Component,
  ComponentType,
  Placement,
  Project,
  Rect,
  Screen,
  Selection,
  ScreenImageMem,
} from "../model/types";
import { clampRect, moveRect, resizeRect, translateRectByAnchor } from "../model/geometry";
import { nextSequentialName, normalizeName } from "../model/names";
import { newId } from "../model/types";

export type Tool = "select" | "anchor" | "component" | "pan";

export type Viewport = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type SaveStatus = "saved" | "unsaved";

type UndoSnapshot = {
  project: Project;
  screenImages: Record<string, ScreenImageMem>;
};

export type EditorState = {
  project: Project;
  selection: Selection;
  activeAnchorId: string | null;
  activeScreenId: string | null;
  tool: Tool;
  viewport: Viewport;
  dirty: boolean;
  saveStatus: SaveStatus;
  projectDir: string | null;
  showOverlays: boolean;
  undoStack: UndoSnapshot[];
  redoStack: UndoSnapshot[];
  screenImages: Record<string, ScreenImageMem>;
};

export type EditorAction =
  | { type: "NEW_PROJECT"; name?: string }
  | { type: "SET_PROJECT"; project: Project; projectDir?: string | null; dirty?: boolean; screenImages?: EditorState["screenImages"] }
  | { type: "RENAME_PROJECT"; name: string }
  | { type: "MARK_SAVED"; projectDir?: string }
  | { type: "DISCARD_SESSION" }
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "SET_SELECTION"; selection: Selection }
  | { type: "SET_ACTIVE_ANCHOR"; screenId: string; anchorId: string | null }
  | { type: "SET_VIEWPORT"; viewport: Partial<Viewport> }
  | { type: "TOGGLE_OVERLAYS" }
  | { type: "ADD_SCREEN"; screen: Screen; imageBytes: Uint8Array; ext: string }
  | { type: "DELETE_SCREEN"; screenId: string }
  | { type: "RENAME_SCREEN"; screenId: string; name: string }
  | { type: "CREATE_ANCHOR"; screenId: string; rect: Rect }
  | { type: "UPDATE_ANCHOR_RECT"; screenId: string; anchorId: string; rect: Rect }
  | { type: "RENAME_ANCHOR"; screenId: string; anchorId: string; name: string }
  | { type: "DELETE_ANCHOR"; screenId: string; anchorId: string }
  | { type: "CREATE_COMPONENT"; screenId: string; anchorId: string; rect: Rect; componentType?: ComponentType }
  | { type: "MAP_COMPONENTS_TO_ANCHOR"; screenId: string; anchorId: string; componentIds: string[] }
  | { type: "UPDATE_PLACEMENT_RECT"; screenId: string; componentId: string; anchorId: string; rect: Rect }
  | { type: "REMOVE_PLACEMENT"; screenId: string; componentId: string; anchorId: string }
  | { type: "DELETE_COMPONENT_EVERYWHERE"; screenId: string; componentId: string }
  | { type: "RENAME_COMPONENT"; screenId: string; componentId: string; name: string }
  | { type: "SET_COMPONENT_TYPE"; screenId: string; componentId: string; componentType: ComponentType }
  | { type: "REPLACE_SCREEN_IMAGE"; screenId: string; bytes: Uint8Array; ext: string }
  | { type: "UNDO" }
  | { type: "REDO" };

const MAX_UNDO = 50;

export function initialEditorState(): EditorState {
  return {
    project: {
      formatVersion: 1,
      id: newId(),
      name: "Untitled project",
      screens: [],
    },
    selection: { kind: "none" },
    activeAnchorId: null,
    activeScreenId: null,
    tool: "select",
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    dirty: false,
    saveStatus: "unsaved",
    projectDir: null,
    showOverlays: true,
    undoStack: [],
    redoStack: [],
    screenImages: {},
  };
}

function cloneProject(project: Project): Project {
  return structuredClone(project);
}

function cloneSnapshot(state: EditorState): UndoSnapshot {
  return {
    project: cloneProject(state.project),
    screenImages: structuredClone(state.screenImages),
  };
}

function withUndo(state: EditorState, nextProject: Project): EditorState {
  return {
    ...state,
    project: nextProject,
    dirty: true,
    saveStatus: "unsaved",
    undoStack: [...state.undoStack, cloneSnapshot(state)].slice(-MAX_UNDO),
    redoStack: [],
  };
}

function updateScreen(project: Project, screenId: string, fn: (s: Screen) => Screen): Project {
  return {
    ...project,
    screens: project.screens.map((s) => (s.id === screenId ? fn(s) : s)),
  };
}

function getScreen(project: Project, screenId: string): Screen | undefined {
  return project.screens.find((s) => s.id === screenId);
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "NEW_PROJECT":
      return { ...initialEditorState(), project: { ...initialEditorState().project, name: action.name ?? "Untitled project" } };

    case "SET_PROJECT": {
      const activeScreenId = action.project.screens[0]?.id ?? null;
      const activeScreen = activeScreenId ? getScreen(action.project, activeScreenId) : undefined;
      const activeAnchorStillValid =
        state.activeAnchorId != null &&
        activeScreen?.anchors.some((a) => a.id === state.activeAnchorId);
      const activeAnchorId = activeAnchorStillValid
        ? state.activeAnchorId
        : (activeScreen?.anchors[0]?.id ?? null);
      return {
        ...state,
        project: action.project,
        projectDir: action.projectDir ?? state.projectDir,
        dirty: action.dirty ?? false,
        saveStatus: action.dirty ? "unsaved" : "saved",
        undoStack: [],
        redoStack: [],
        selection: { kind: "none" },
        activeAnchorId,
        activeScreenId,
        screenImages: action.screenImages ?? {},
      };
    }

    case "MARK_SAVED":
      return {
        ...state,
        dirty: false,
        saveStatus: "saved",
        projectDir: action.projectDir ?? state.projectDir,
      };

    case "RENAME_PROJECT": {
      const name = normalizeName(action.name);
      return withUndo(state, { ...state.project, name });
    }

    case "DISCARD_SESSION":
      return {
        ...state,
        dirty: false,
        saveStatus: state.projectDir ? "saved" : "unsaved",
      };

    case "SET_TOOL":
      return { ...state, tool: action.tool };

    case "SET_SELECTION":
      return { ...state, selection: action.selection };

    case "SET_ACTIVE_ANCHOR":
      return {
        ...state,
        activeScreenId: action.screenId,
        activeAnchorId: action.anchorId,
      };

    case "SET_VIEWPORT":
      return { ...state, viewport: { ...state.viewport, ...action.viewport } };

    case "TOGGLE_OVERLAYS":
      return { ...state, showOverlays: !state.showOverlays };

    case "ADD_SCREEN": {
      const next = withUndo(state, {
        ...state.project,
        screens: [...state.project.screens, action.screen],
      });
      return {
        ...next,
        screenImages: {
          ...next.screenImages,
          [action.screen.id]: {
            bytes: action.imageBytes,
            ext: action.ext,
            pendingWrite: true,
          },
        },
        activeScreenId: action.screen.id,
        selection: { kind: "screen", screenId: action.screen.id },
      };
    }

    case "DELETE_SCREEN": {
      const nextProject = {
        ...state.project,
        screens: state.project.screens.filter((s) => s.id !== action.screenId),
      };
      const { [action.screenId]: _, ...restImages } = state.screenImages;
      return {
        ...withUndo(state, nextProject),
        screenImages: restImages,
        selection: { kind: "none" },
        activeScreenId: nextProject.screens[0]?.id ?? null,
        activeAnchorId: null,
      };
    }

    case "RENAME_SCREEN": {
      const name = normalizeName(action.name);
      return withUndo(
        state,
        updateScreen(state.project, action.screenId, (s) => ({ ...s, name })),
      );
    }

    case "CREATE_ANCHOR": {
      const screen = getScreen(state.project, action.screenId);
      if (!screen) return state;
      const anchor: Anchor = {
        id: newId(),
        name: nextSequentialName(
          "anchor",
          screen.anchors.map((a) => a.name),
        ),
        rect: action.rect,
      };
      const next = updateScreen(state.project, action.screenId, (s) => ({
        ...s,
        anchors: [...s.anchors, anchor],
      }));
      return {
        ...withUndo(state, next),
        selection: { kind: "anchor", screenId: action.screenId, anchorId: anchor.id },
        activeAnchorId: anchor.id,
        activeScreenId: action.screenId,
        tool: "select",
      };
    }

    case "UPDATE_ANCHOR_RECT": {
      const screen = getScreen(state.project, action.screenId);
      if (!screen) return state;
      const bounds = screen.image;
      const rect = clampRect(action.rect, bounds);
      return withUndo(
        state,
        updateScreen(state.project, action.screenId, (s) => ({
          ...s,
          anchors: s.anchors.map((a) =>
            a.id === action.anchorId ? { ...a, rect } : a,
          ),
        })),
      );
    }

    case "RENAME_ANCHOR": {
      const name = normalizeName(action.name);
      return withUndo(
        state,
        updateScreen(state.project, action.screenId, (s) => ({
          ...s,
          anchors: s.anchors.map((a) =>
            a.id === action.anchorId ? { ...a, name } : a,
          ),
        })),
      );
    }

    case "DELETE_ANCHOR": {
      const screen = getScreen(state.project, action.screenId);
      if (!screen) return state;
      const nextScreen: Screen = {
        ...screen,
        anchors: screen.anchors.filter((a) => a.id !== action.anchorId),
        components: screen.components
          .map((c) => ({
            ...c,
            placements: c.placements.filter((p) => p.anchorId !== action.anchorId),
          }))
          .filter((c) => c.placements.length > 0),
      };
      return {
        ...withUndo(state, updateScreen(state.project, action.screenId, () => nextScreen)),
        activeAnchorId:
          state.activeAnchorId === action.anchorId ? null : state.activeAnchorId,
        selection: { kind: "screen", screenId: action.screenId },
      };
    }

    case "CREATE_COMPONENT": {
      const screen = getScreen(state.project, action.screenId);
      if (!screen) return state;
      const component: Component = {
        id: newId(),
        name: nextSequentialName(
          "component",
          screen.components.map((c) => c.name),
        ),
        type: action.componentType ?? "bbox",
        placements: [{ anchorId: action.anchorId, rect: action.rect }],
      };
      const next = updateScreen(state.project, action.screenId, (s) => ({
        ...s,
        components: [...s.components, component],
      }));
      return {
        ...withUndo(state, next),
        selection: {
          kind: "placement",
          screenId: action.screenId,
          anchorId: action.anchorId,
          componentId: component.id,
        },
        tool: "select",
      };
    }

    case "MAP_COMPONENTS_TO_ANCHOR": {
      const screen = getScreen(state.project, action.screenId);
      const target = screen?.anchors.find((a) => a.id === action.anchorId);
      if (!screen || !target) return state;

      const additions = new Map<string, Placement>();
      let lastComponentId: string | null = null;
      for (const componentId of action.componentIds) {
        const component = screen.components.find((c) => c.id === componentId);
        if (!component) continue;
        if (component.placements.some((p) => p.anchorId === action.anchorId)) continue;
        const sourcePlacement = component.placements.find((p) => p.anchorId !== action.anchorId);
        if (!sourcePlacement) continue;
        const sourceAnchor = screen.anchors.find((a) => a.id === sourcePlacement.anchorId);
        if (!sourceAnchor) continue;
        additions.set(componentId, {
          anchorId: action.anchorId,
          rect: clampRect(
            translateRectByAnchor(sourcePlacement.rect, sourceAnchor.rect, target.rect),
            screen.image,
          ),
        });
        lastComponentId = componentId;
      }
      if (additions.size === 0 || lastComponentId == null) return state;
      const next = updateScreen(state.project, action.screenId, (s) => ({
        ...s,
        components: s.components.map((c) => {
          const placement = additions.get(c.id);
          return placement ? { ...c, placements: [...c.placements, placement] } : c;
        }),
      }));
      return {
        ...withUndo(state, next),
        activeAnchorId: action.anchorId,
        selection: {
          kind: "placement",
          screenId: action.screenId,
          anchorId: action.anchorId,
          componentId: lastComponentId,
        },
        tool: "select",
      };
    }

    case "UPDATE_PLACEMENT_RECT": {
      const screen = getScreen(state.project, action.screenId);
      if (!screen) return state;
      const rect = clampRect(action.rect, screen.image);
      return withUndo(
        state,
        updateScreen(state.project, action.screenId, (s) => ({
          ...s,
          components: s.components.map((c) =>
            c.id === action.componentId
              ? {
                  ...c,
                  placements: c.placements.map((p) =>
                    p.anchorId === action.anchorId ? { ...p, rect } : p,
                  ),
                }
              : c,
          ),
        })),
      );
    }

    case "REMOVE_PLACEMENT": {
      const screen = getScreen(state.project, action.screenId);
      if (!screen) return state;
      const nextComponents = screen.components
        .map((c) => {
          if (c.id !== action.componentId) return c;
          return {
            ...c,
            placements: c.placements.filter((p) => p.anchorId !== action.anchorId),
          };
        })
        .filter((c) => c.placements.length > 0);
      return {
        ...withUndo(
          state,
          updateScreen(state.project, action.screenId, (s) => ({
            ...s,
            components: nextComponents,
          })),
        ),
        selection: { kind: "anchor", screenId: action.screenId, anchorId: action.anchorId },
      };
    }

    case "DELETE_COMPONENT_EVERYWHERE":
      return withUndo(
        state,
        updateScreen(state.project, action.screenId, (s) => ({
          ...s,
          components: s.components.filter((c) => c.id !== action.componentId),
        })),
      );

    case "RENAME_COMPONENT": {
      const name = normalizeName(action.name);
      return withUndo(
        state,
        updateScreen(state.project, action.screenId, (s) => ({
          ...s,
          components: s.components.map((c) =>
            c.id === action.componentId ? { ...c, name } : c,
          ),
        })),
      );
    }

    case "SET_COMPONENT_TYPE":
      return withUndo(
        state,
        updateScreen(state.project, action.screenId, (s) => ({
          ...s,
          components: s.components.map((c) =>
            c.id === action.componentId ? { ...c, type: action.componentType } : c,
          ),
        })),
      );

    case "REPLACE_SCREEN_IMAGE": {
      const nextImages = {
        ...state.screenImages,
        [action.screenId]: {
          bytes: action.bytes,
          ext: action.ext,
          pendingWrite: true,
        },
      };
      return {
        ...state,
        screenImages: nextImages,
        dirty: true,
        saveStatus: "unsaved",
        undoStack: [...state.undoStack, cloneSnapshot(state)].slice(-MAX_UNDO),
        redoStack: [],
      };
    }

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1]!;
      return {
        ...state,
        project: prev.project,
        screenImages: prev.screenImages,
        redoStack: [...state.redoStack, cloneSnapshot(state)],
        undoStack: state.undoStack.slice(0, -1),
        dirty: true,
        saveStatus: "unsaved",
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1]!;
      return {
        ...state,
        project: next.project,
        screenImages: next.screenImages,
        undoStack: [...state.undoStack, cloneSnapshot(state)],
        redoStack: state.redoStack.slice(0, -1),
        dirty: true,
        saveStatus: "unsaved",
      };
    }

    default:
      return state;
  }
}

export function movePlacementRect(
  screen: Screen,
  componentId: string,
  anchorId: string,
  dx: number,
  dy: number,
): Rect | null {
  const component = screen.components.find((c) => c.id === componentId);
  const placement = component?.placements.find((p) => p.anchorId === anchorId);
  if (!placement) return null;
  return moveRect(placement.rect, dx, dy, screen.image);
}

export function resizePlacementRect(
  screen: Screen,
  componentId: string,
  anchorId: string,
  next: Partial<Rect>,
): Rect | null {
  const component = screen.components.find((c) => c.id === componentId);
  const placement = component?.placements.find((p) => p.anchorId === anchorId);
  if (!placement) return null;
  return resizeRect(placement.rect, next, screen.image);
}

export function unmappedComponentsForAnchor(screen: Screen, anchorId: string): Component[] {
  return screen.components.filter(
    (c) => !c.placements.some((p) => p.anchorId === anchorId),
  );
}

export function placementCountForAnchor(screen: Screen, anchorId: string): number {
  return screen.components.reduce(
    (n, c) => n + (c.placements.some((p) => p.anchorId === anchorId) ? 1 : 0),
    0,
  );
}

export function totalMappingsOnScreen(screen: Screen): number {
  return screen.components.reduce((n, c) => n + c.placements.length, 0);
}
