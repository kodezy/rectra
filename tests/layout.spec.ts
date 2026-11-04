import { describe, expect, it } from "vitest";
import {
  CANVAS_TOOLBAR_HEIGHT,
  EXPLORER_WIDTH,
  EXPLORER_WIDTH_COMPACT,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  INSPECTOR_WIDTH,
  INSPECTOR_WIDTH_COMPACT,
  TOOLRAIL_HEIGHT,
  TOOLRAIL_OFFSET_Y,
  TOOLRAIL_WIDTH,
  TOOLRAIL_WIDTH_COMPACT,
  explorerDefaultWidth,
  inspectorDefaultWidth,
  isCompactWidth,
  toolrailWidth,
} from "../ui/app/layout";

describe("Penpot layout tokens AC-42", () => {
  it("uses header 56 and footer 28", () => {
    expect(HEADER_HEIGHT).toBe(56);
    expect(FOOTER_HEIGHT).toBe(28);
  });

  it("uses explorer 240 and inspector 296 at 1440", () => {
    expect(isCompactWidth(1440)).toBe(false);
    expect(explorerDefaultWidth(false)).toBe(EXPLORER_WIDTH);
    expect(inspectorDefaultWidth(false)).toBe(INSPECTOR_WIDTH);
    expect(EXPLORER_WIDTH).toBe(240);
    expect(INSPECTOR_WIDTH).toBe(296);
  });

  it("uses explorer 208 and inspector 256 below 1280 (1100 / 1024)", () => {
    expect(isCompactWidth(1100)).toBe(true);
    expect(isCompactWidth(1024)).toBe(true);
    expect(explorerDefaultWidth(true)).toBe(EXPLORER_WIDTH_COMPACT);
    expect(inspectorDefaultWidth(true)).toBe(INSPECTOR_WIDTH_COMPACT);
    expect(EXPLORER_WIDTH_COMPACT).toBe(208);
    expect(INSPECTOR_WIDTH_COMPACT).toBe(256);
  });

  it("uses a 50 px canvas chrome and a 48/44 toolrail", () => {
    expect(CANVAS_TOOLBAR_HEIGHT).toBe(50);
    expect(toolrailWidth(false)).toBe(TOOLRAIL_WIDTH);
    expect(toolrailWidth(true)).toBe(TOOLRAIL_WIDTH_COMPACT);
    expect(TOOLRAIL_WIDTH).toBe(48);
    expect(TOOLRAIL_WIDTH_COMPACT).toBe(44);
    expect(TOOLRAIL_HEIGHT).toBe(208);
    expect(TOOLRAIL_OFFSET_Y).toBe(52);
  });
});
