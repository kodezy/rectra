import { describe, expect, it } from "vitest";
import { editorReducer, initialEditorState } from "../ui/editor/reducer";
import { specExampleProject } from "../ui/model/fixture";

describe("editorReducer", () => {
  it("AC-11 remove mapping on one anchor keeps other", () => {
    let state = initialEditorState();
    state = {
      ...state,
      project: specExampleProject(),
      activeScreenId: "screen-001",
      activeAnchorId: "anchor-001",
    };
    const search = state.project.screens[0]!.components[0]!;
    state = editorReducer(state, {
      type: "REMOVE_PLACEMENT",
      screenId: "screen-001",
      componentId: search.id,
      anchorId: "anchor-001",
    });
    const updated = state.project.screens[0]!.components.find((c) => c.id === search.id);
    expect(updated?.placements).toHaveLength(1);
    expect(updated?.placements[0]?.anchorId).toBe("anchor-002");
  });

  it("AC-12 removing last placement removes component", () => {
    let state = initialEditorState();
    const project = specExampleProject();
    const screen = project.screens[0]!;
    const lone = screen.components[0]!;
    screen.components = [{ ...lone, placements: [lone.placements[0]!] }];
    project.screens = [screen];
    state = { ...state, project, activeScreenId: screen.id };

    state = editorReducer(state, {
      type: "REMOVE_PLACEMENT",
      screenId: screen.id,
      componentId: lone.id,
      anchorId: lone.placements[0]!.anchorId,
    });
    expect(state.project.screens[0]!.components).toHaveLength(0);
  });

  it("AC-09 moving anchor does not move placements", () => {
    let state = initialEditorState();
    state = { ...state, project: specExampleProject(), activeScreenId: "screen-001" };
    const before = structuredClone(state.project.screens[0]!.components[0]!.placements[0]!.rect);
    state = editorReducer(state, {
      type: "UPDATE_ANCHOR_RECT",
      screenId: "screen-001",
      anchorId: "anchor-001",
      rect: { x: 210, y: 100, width: 90, height: 30 },
    });
    const after = state.project.screens[0]!.components[0]!.placements[0]!.rect;
    expect(after).toEqual(before);
  });

  it("undo restores screen image bytes", () => {
    let state = initialEditorState();
    state = {
      ...state,
      project: specExampleProject(),
      activeScreenId: "screen-001",
      screenImages: {
        "screen-001": { bytes: new Uint8Array([1, 2]), ext: "png", pendingWrite: false },
      },
    };
    state = editorReducer(state, {
      type: "REPLACE_SCREEN_IMAGE",
      screenId: "screen-001",
      bytes: new Uint8Array([9]),
      ext: "png",
    });
    expect(state.screenImages["screen-001"]?.bytes).toEqual(new Uint8Array([9]));
    state = editorReducer(state, { type: "UNDO" });
    expect(state.screenImages["screen-001"]?.bytes).toEqual(new Uint8Array([1, 2]));
  });
});
