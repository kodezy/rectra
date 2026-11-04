import type { EditorAction, EditorState } from "../editor/reducer";
import { placementCountForAnchor } from "../editor/reducer";
import type { Screen } from "../model/types";
import type { DialogState } from "./dialogState";

type Dispatch = (action: EditorAction) => void;
type SetDialog = (d: DialogState) => void;

function getScreen(state: EditorState, screenId: string): Screen | undefined {
  return state.project.screens.find((s) => s.id === screenId);
}

function componentsRemovedWithAnchor(screen: Screen, anchorId: string): number {
  return screen.components.filter((c) =>
    c.placements.every((p) => p.anchorId === anchorId),
  ).length;
}

export function handleDeleteSelection(
  state: EditorState,
  dispatch: Dispatch,
  setDialog: SetDialog,
) {
  const sel = state.selection;

  if (sel.kind === "placement") {
    dispatch({
      type: "REMOVE_PLACEMENT",
      screenId: sel.screenId,
      componentId: sel.componentId,
      anchorId: sel.anchorId,
    });
    return;
  }

  if (sel.kind === "anchor") {
    const screen = getScreen(state, sel.screenId);
    if (!screen) return;
    const mappings = placementCountForAnchor(screen, sel.anchorId);
    const componentsRemoved = componentsRemovedWithAnchor(screen, sel.anchorId);
    const parts = [
      `This removes the anchor and ${mappings} mapping${mappings === 1 ? "" : "s"}.`,
    ];
    if (componentsRemoved > 0) {
      parts.push(
        `${componentsRemoved} component${componentsRemoved === 1 ? "" : "s"} will be removed with no other mappings.`,
      );
    }
    parts.push("Other anchors remain unchanged.");
    setDialog({
      kind: "confirmDelete",
      title: "Delete anchor?",
      message: parts.join("\n"),
      onConfirm: () =>
        dispatch({ type: "DELETE_ANCHOR", screenId: sel.screenId, anchorId: sel.anchorId }),
    });
    return;
  }

  if (sel.kind === "screen") {
    setDialog({
      kind: "confirmDelete",
      title: "Delete screen",
      message: "This removes the screen, all anchors, components, and the screenshot association.",
      onConfirm: () => dispatch({ type: "DELETE_SCREEN", screenId: sel.screenId }),
    });
  }
}

export function confirmDeleteComponentEverywhere(
  state: EditorState,
  screenId: string,
  componentId: string,
  setDialog: SetDialog,
  dispatch: Dispatch,
) {
  const screen = getScreen(state, screenId);
  if (!screen) return;
  const component = screen.components.find((c) => c.id === componentId);
  if (!component) return;
  setDialog({
    kind: "confirmDelete",
    title: "Delete everywhere",
    message: `Remove ${component.name} and ${component.placements.length} mapping${component.placements.length === 1 ? "" : "s"} on all anchors?`,
    onConfirm: () =>
      dispatch({ type: "DELETE_COMPONENT_EVERYWHERE", screenId, componentId }),
  });
}
