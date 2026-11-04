import { describe, expect, it } from "vitest";
import {
  buildExportMappings,
  offsetValues,
  rectFromDragEndpoints,
  specExampleProject,
  validateProject,
} from "../ui/model";

describe("spec example offsets AC-03–AC-05", () => {
  const project = specExampleProject();
  const screen = project.screens[0]!;
  const anchorA = screen.anchors[0]!;
  const anchorB = screen.anchors[1]!;
  const search = screen.components.find((c) => c.name === "search_field")!;
  const submit = screen.components.find((c) => c.name === "submit_button")!;

  it("AC-03 search_field in A", () => {
    const pl = search.placements.find((p) => p.anchorId === anchorA.id)!;
    expect(offsetValues("bbox", pl.rect, anchorA.rect)).toEqual([150, 55, 370, 95]);
  });

  it("AC-04 search_field in B", () => {
    const pl = search.placements.find((p) => p.anchorId === anchorB.id)!;
    expect(offsetValues("bbox", pl.rect, anchorB.rect)).toEqual([150, 45, 370, 85]);
  });

  it("AC-05 submit_button offsets", () => {
    const plA = submit.placements.find((p) => p.anchorId === anchorA.id)!;
    const plB = submit.placements.find((p) => p.anchorId === anchorB.id)!;
    expect(offsetValues("coord", plA.rect, anchorA.rect)).toEqual([
      [400, 300],
      [500, 340],
    ]);
    expect(offsetValues("coord", plB.rect, anchorB.rect)).toEqual([
      [250, 210],
      [350, 250],
    ]);
  });

  it("AC-29 export JSON shape", () => {
    const exp = buildExportMappings(project);
    const a = exp.screens[0]!.anchors[0]!;
    const searchExp = a.components.find((c) => c.name === "search_field")!;
    expect(searchExp.offset).toEqual([150, 55, 370, 95]);
    expect(validateProject(project)).toEqual(project);
  });
});

describe("geometry", () => {
  it("rejects sub 1x1 drag", () => {
    expect(rectFromDragEndpoints(10, 10, 10, 10, { width: 100, height: 100 })).toBeNull();
  });
});
