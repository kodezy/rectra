import { describe, expect, it } from "vitest";
import { imagePointFromStage } from "../src/model/geometry";
import {
  clampUserScale,
  fitImageInHost,
  stepUserScale,
  zoomToward,
} from "../src/editor/viewport";

describe("fitImageInHost", () => {
  it("letterboxes and caps fit scale at 2", () => {
    const fit = fitImageInHost(800, 600, 400, 300);
    expect(fit.scale).toBe(2);
    expect(fit.x).toBe(0);
    expect(fit.y).toBe(0);
  });

  it("centers when host is larger than image at fit scale", () => {
    const fit = fitImageInHost(1000, 800, 400, 300);
    expect(fit.scale).toBe(2);
    expect(fit.x).toBe(100);
    expect(fit.y).toBe(100);
  });
});

describe("clampUserScale", () => {
  it("clamps to 0.5 and 2", () => {
    expect(clampUserScale(0.3)).toBe(0.5);
    expect(clampUserScale(2.5)).toBe(2);
  });

  it("rounds to tenths", () => {
    expect(clampUserScale(1.04)).toBe(1);
    expect(clampUserScale(1.06)).toBe(1.1);
  });
});

describe("stepUserScale", () => {
  it("steps by 0.1 within bounds", () => {
    expect(stepUserScale(1, 1)).toBe(1.1);
    expect(stepUserScale(1, -1)).toBe(0.9);
    expect(stepUserScale(0.5, -1)).toBe(0.5);
    expect(stepUserScale(2, 1)).toBe(2);
  });
});

describe("zoomToward", () => {
  const fit = { scale: 1, x: 100, y: 50 };
  const base = { scale: 1, offsetX: 0, offsetY: 0 };

  function imageUnderPivot(
    viewport: { scale: number; offsetX: number; offsetY: number },
    pivot: { x: number; y: number },
  ) {
    const displayScale = viewport.scale * fit.scale;
    const imageX = fit.x + viewport.offsetX;
    const imageY = fit.y + viewport.offsetY;
    return imagePointFromStage(pivot.x, pivot.y, imageX, imageY, displayScale);
  }

  it("keeps image point under pivot when zooming", () => {
    const pivot = { x: 300, y: 200 };
    const before = imageUnderPivot(base, pivot);
    const next = zoomToward(base, fit, pivot, 1.2);
    const after = imageUnderPivot(next, pivot);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });

  it("returns same viewport at scale limits", () => {
    const atMax = { scale: 2, offsetX: 10, offsetY: -5 };
    expect(zoomToward(atMax, fit, { x: 400, y: 300 }, 2.2)).toEqual(atMax);
  });

  it("uses different offsets for center vs corner pivot", () => {
    const center = zoomToward(base, fit, { x: 500, y: 400 }, 1.3);
    const corner = zoomToward(base, fit, { x: 100, y: 50 }, 1.3);
    expect(center.offsetX).not.toBe(corner.offsetX);
    expect(center.offsetY).not.toBe(corner.offsetY);
  });
});
