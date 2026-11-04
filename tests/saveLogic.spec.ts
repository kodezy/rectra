import { describe, expect, it } from "vitest";
import type { Project, Screen, ScreenImageMem } from "../src/model/types";
import {
  applySavedScreenAssets,
  isExportMappingsDocument,
  isProjectDocument,
  shouldWriteScreenAsset,
} from "../src/persistence/saveLogic";

const screen: Screen = {
  id: "s1",
  name: "Overview",
  image: { path: "assets/screens/a.png", width: 100, height: 100 },
  anchors: [],
  components: [],
};

describe("saveLogic", () => {
  it("shouldWriteScreenAsset when pending or empty path", () => {
    const mem: ScreenImageMem = { bytes: new Uint8Array([1]), ext: "png", pendingWrite: false };
    expect(shouldWriteScreenAsset({ ...screen, image: { ...screen.image, path: "" } }, mem)).toBe(
      true,
    );
    expect(shouldWriteScreenAsset(screen, { ...mem, pendingWrite: true })).toBe(true);
    expect(shouldWriteScreenAsset(screen, mem)).toBe(false);
  });

  it("applySavedScreenAssets clears pendingWrite", () => {
    const project: Project = {
      id: "p",
      name: "P",
      screens: [screen],
    };
    const images = {
      s1: { bytes: new Uint8Array(), ext: "png", pendingWrite: true },
    };
    const next = applySavedScreenAssets(project, images);
    expect(next.s1?.pendingWrite).toBe(false);
  });

  it("distinguishes export vs project JSON shape", () => {
    expect(
      isExportMappingsDocument({
        formatVersion: 1,
        projectId: "x",
        projectName: "X",
        screens: [{ imageSize: { width: 1, height: 1 } }],
      }),
    ).toBe(true);
    expect(
      isProjectDocument({
        formatVersion: 1,
        id: "x",
        name: "X",
        screens: [{ image: { path: "a", width: 1, height: 1 } }],
      }),
    ).toBe(true);
    expect(
      isExportMappingsDocument({
        formatVersion: 1,
        id: "x",
        screens: [{ image: { path: "a" } }],
      }),
    ).toBe(false);
  });
});
