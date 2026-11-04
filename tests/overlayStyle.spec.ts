import { describe, expect, it } from "vitest";
import { overlayStroke } from "@ui/editor/canvas/overlayStyle";

describe("overlayStroke", () => {
  it("uses a solid 2px white stroke for the selected box", () => {
    expect(overlayStroke("anchor", true, false)).toEqual({
      color: "#FFFFFF",
      width: 2,
    });
    expect(overlayStroke("placement", true, false)).toEqual({
      color: "#FFFFFF",
      width: 2,
    });
  });

  it("uses a solid 1.5px stroke for anchors, brighter when active", () => {
    expect(overlayStroke("anchor", false, false)).toEqual({
      color: "#8D96A0",
      width: 1.5,
    });
    expect(overlayStroke("anchor", false, true)).toEqual({
      color: "#B3BBC5",
      width: 1.5,
    });
  });

  it("uses a dashed 1.5px stroke for unselected placements", () => {
    expect(overlayStroke("placement", false, false)).toEqual({
      color: "#AAB3BD",
      width: 1.5,
      dash: [6, 4],
    });
  });
});
