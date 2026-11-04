import { describe, expect, it } from "vitest";
import {
  editorReducer,
  initialEditorState,
  placementCountForAnchor,
  totalMappingsOnScreen,
  unmappedComponentsForAnchor,
  type EditorState,
} from "@core/editor/reducer";
import { specExampleProject } from "@core/model/fixture";

function withSpec(): EditorState {
  return {
    ...initialEditorState(),
    project: specExampleProject(),
    activeScreenId: "screen-001",
    activeAnchorId: "anchor-001",
  };
}

describe("editorReducer", () => {
  it("SET_PROJECT selects first anchor on active screen", () => {
    const state = editorReducer(initialEditorState(), {
      type: "SET_PROJECT",
      project: specExampleProject(),
      projectDir: "/tmp/foo.rectra",
      dirty: false,
      screenImages: {},
    });
    expect(state.activeScreenId).toBe("screen-001");
    expect(state.activeAnchorId).toBe("anchor-001");
  });

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

  it("maps selected components onto an anchor using existing offsets", () => {
    let state = initialEditorState();
    const project = specExampleProject();
    const screen = project.screens[0]!;
    screen.components = screen.components.map((c) => ({
      ...c,
      placements: c.placements.filter((p) => p.anchorId === "anchor-001"),
    }));
    state = { ...state, project, activeScreenId: "screen-001", activeAnchorId: "anchor-002" };

    state = editorReducer(state, {
      type: "MAP_COMPONENTS_TO_ANCHOR",
      screenId: "screen-001",
      anchorId: "anchor-002",
      componentIds: ["component-001", "component-002"],
    });

    const mapped = state.project.screens[0]!.components;
    const search = mapped.find((c) => c.id === "component-001")!;
    const submit = mapped.find((c) => c.id === "component-002")!;
    expect(search.placements.find((p) => p.anchorId === "anchor-002")?.rect).toEqual({
      x: 570,
      y: 255,
      width: 220,
      height: 40,
    });
    expect(submit.placements.find((p) => p.anchorId === "anchor-002")?.rect).toEqual({
      x: 820,
      y: 500,
      width: 100,
      height: 40,
    });
    expect(state.selection).toEqual({
      kind: "placement",
      screenId: "screen-001",
      anchorId: "anchor-002",
      componentId: "component-002",
    });
  });

  it("skips components already mapped to the target anchor", () => {
    let state = initialEditorState();
    state = { ...state, project: specExampleProject(), activeScreenId: "screen-001" };
    const before = structuredClone(state.project.screens[0]!.components[0]!.placements);
    state = editorReducer(state, {
      type: "MAP_COMPONENTS_TO_ANCHOR",
      screenId: "screen-001",
      anchorId: "anchor-001",
      componentIds: ["component-001"],
    });
    expect(state.project.screens[0]!.components[0]!.placements).toEqual(before);
    expect(state.dirty).toBe(false);
  });

  it("NEW_PROJECT uses the given name and an empty screen list", () => {
    const loaded = editorReducer(initialEditorState(), {
      type: "SET_PROJECT",
      project: specExampleProject(),
    });
    const next = editorReducer(loaded, { type: "NEW_PROJECT", name: "Fresh" });
    expect(next.project.name).toBe("Fresh");
    expect(next.project.screens).toEqual([]);
    expect(next.project.id).not.toBe(loaded.project.id);
    expect(next.dirty).toBe(false);
  });

  it("CREATE_ANCHOR names the next sequential anchor and selects it", () => {
    const state = editorReducer(withSpec(), {
      type: "CREATE_ANCHOR",
      screenId: "screen-001",
      rect: { x: 10, y: 10, width: 40, height: 20 },
    });
    const anchors = state.project.screens[0]!.anchors;
    expect(anchors).toHaveLength(3);
    expect(anchors[2]!.name).toBe("anchor_1");
    expect(state.selection).toEqual({
      kind: "anchor",
      screenId: "screen-001",
      anchorId: anchors[2]!.id,
    });
    expect(state.activeAnchorId).toBe(anchors[2]!.id);
    expect(state.tool).toBe("select");
    expect(state.dirty).toBe(true);
  });

  it("CREATE_COMPONENT maps onto the given anchor", () => {
    const state = editorReducer(withSpec(), {
      type: "CREATE_COMPONENT",
      screenId: "screen-001",
      anchorId: "anchor-001",
      rect: { x: 20, y: 20, width: 30, height: 10 },
      componentType: "coord",
    });
    const created = state.project.screens[0]!.components.find((c) => c.name === "component_1");
    expect(created?.type).toBe("coord");
    expect(created?.placements).toEqual([
      { anchorId: "anchor-001", rect: { x: 20, y: 20, width: 30, height: 10 } },
    ]);
    expect(state.selection).toEqual({
      kind: "placement",
      screenId: "screen-001",
      anchorId: "anchor-001",
      componentId: created!.id,
    });
  });

  it("DELETE_ANCHOR drops that placement and components with no remaining mapping", () => {
    let state = withSpec();
    const search = state.project.screens[0]!.components[0]!;
    state.project.screens[0]!.components = [
      { ...search, placements: [search.placements[0]!] },
      state.project.screens[0]!.components[1]!,
    ];
    state = editorReducer(state, {
      type: "DELETE_ANCHOR",
      screenId: "screen-001",
      anchorId: "anchor-001",
    });
    const screen = state.project.screens[0]!;
    expect(screen.anchors.map((a) => a.id)).toEqual(["anchor-002"]);
    expect(screen.components.map((c) => c.id)).toEqual(["component-002"]);
    expect(screen.components[0]!.placements.map((p) => p.anchorId)).toEqual(["anchor-002"]);
    expect(state.selection).toEqual({ kind: "screen", screenId: "screen-001" });
    expect(state.activeAnchorId).toBeNull();
  });

  it("DELETE_SCREEN clears selection and activates the remaining screen", () => {
    let state = withSpec();
    state = editorReducer(state, {
      type: "ADD_SCREEN",
      screen: {
        id: "screen-002",
        name: "Second",
        image: { path: "assets/screens/b.png", width: 100, height: 80 },
        anchors: [],
        components: [],
      },
      imageBytes: new Uint8Array([1]),
      ext: "png",
    });
    expect(state.activeScreenId).toBe("screen-002");
    state = editorReducer(state, { type: "DELETE_SCREEN", screenId: "screen-002" });
    expect(state.activeScreenId).toBe("screen-001");
    expect(state.selection).toEqual({ kind: "none" });
    expect(state.screenImages["screen-002"]).toBeUndefined();
  });

  it("UPDATE_PLACEMENT_RECT clamps to the screenshot", () => {
    const state = editorReducer(withSpec(), {
      type: "UPDATE_PLACEMENT_RECT",
      screenId: "screen-001",
      componentId: "component-001",
      anchorId: "anchor-001",
      rect: { x: -10, y: 700, width: 50, height: 50 },
    });
    const rect = state.project.screens[0]!.components[0]!.placements[0]!.rect;
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y + rect.height).toBeLessThanOrEqual(720);
  });

  it("redo restores screen image bytes after undo", () => {
    let state = withSpec();
    state = {
      ...state,
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
    state = editorReducer(state, { type: "UNDO" });
    state = editorReducer(state, { type: "REDO" });
    expect(state.screenImages["screen-001"]?.bytes).toEqual(new Uint8Array([9]));
  });

  it("counts mappings and unmapped components per anchor", () => {
    const screen = specExampleProject().screens[0]!;
    expect(placementCountForAnchor(screen, "anchor-001")).toBe(2);
    expect(totalMappingsOnScreen(screen)).toBe(4);
    expect(unmappedComponentsForAnchor(screen, "anchor-001")).toEqual([]);
    const onlyA = {
      ...screen,
      components: screen.components.map((c) => ({
        ...c,
        placements: c.placements.filter((p) => p.anchorId === "anchor-001"),
      })),
    };
    expect(unmappedComponentsForAnchor(onlyA, "anchor-002").map((c) => c.id)).toEqual([
      "component-001",
      "component-002",
    ]);
  });
});
