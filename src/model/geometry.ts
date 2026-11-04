import type { ImageBounds, Rect } from "./types";

export type { Rect, ImageBounds } from "./types";

export function normalizeDragRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): Rect {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function clampRect(rect: Rect, bounds: ImageBounds): Rect {
  let { x, y, width, height } = rect;
  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));
  x = Math.round(x);
  y = Math.round(y);

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x + width > bounds.width) {
    x = Math.max(0, bounds.width - width);
  }
  if (y + height > bounds.height) {
    y = Math.max(0, bounds.height - height);
  }
  if (x + width > bounds.width) width = bounds.width - x;
  if (y + height > bounds.height) height = bounds.height - y;

  return { x, y, width, height };
}

export function isRectValid(rect: Rect, bounds: ImageBounds): boolean {
  if (
    !Number.isInteger(rect.x) ||
    !Number.isInteger(rect.y) ||
    !Number.isInteger(rect.width) ||
    !Number.isInteger(rect.height)
  ) {
    return false;
  }
  if (rect.x < 0 || rect.y < 0 || rect.width < 1 || rect.height < 1) {
    return false;
  }
  return (
    rect.x + rect.width <= bounds.width &&
    rect.y + rect.height <= bounds.height
  );
}

export function rectFromDragEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bounds: ImageBounds,
): Rect | null {
  const rx1 = Math.round(Math.max(0, x1));
  const ry1 = Math.round(Math.max(0, y1));
  const rx2 = Math.round(Math.max(0, x2));
  const ry2 = Math.round(Math.max(0, y2));
  const raw = normalizeDragRect(rx1, ry1, rx2, ry2);
  if (raw.width < 1 || raw.height < 1) return null;
  const clamped = clampRect(raw, bounds);
  if (clamped.width < 1 || clamped.height < 1) return null;
  if (!isRectValid(clamped, bounds)) return null;
  return clamped;
}

export function moveRect(rect: Rect, dx: number, dy: number, bounds: ImageBounds): Rect {
  return clampRect(
    {
      x: rect.x + Math.round(dx),
      y: rect.y + Math.round(dy),
      width: rect.width,
      height: rect.height,
    },
    bounds,
  );
}

export function resizeRect(
  rect: Rect,
  next: Partial<Rect>,
  bounds: ImageBounds,
): Rect {
  return clampRect({ ...rect, ...next }, bounds);
}

export function imagePointFromStage(
  stageX: number,
  stageY: number,
  imageX: number,
  imageY: number,
  scale: number,
): { x: number; y: number } {
  return {
    x: (stageX - imageX) / scale,
    y: (stageY - imageY) / scale,
  };
}

export function formatOffset(
  type: "coord" | "bbox",
  placement: Rect,
  anchor: Rect,
): string {
  const dx1 = placement.x - anchor.x;
  const dy1 = placement.y - anchor.y;
  const dx2 = placement.x + placement.width - anchor.x;
  const dy2 = placement.y + placement.height - anchor.y;
  if (type === "bbox") {
    return `[${dx1}, ${dy1}, ${dx2}, ${dy2}]`;
  }
  return `[[${dx1}, ${dy1}], [${dx2}, ${dy2}]]`;
}

export function offsetValues(
  type: "coord" | "bbox",
  placement: Rect,
  anchor: Rect,
): number[] | number[][] {
  const dx1 = placement.x - anchor.x;
  const dy1 = placement.y - anchor.y;
  const dx2 = placement.x + placement.width - anchor.x;
  const dy2 = placement.y + placement.height - anchor.y;
  if (type === "bbox") return [dx1, dy1, dx2, dy2];
  return [
    [dx1, dy1],
    [dx2, dy2],
  ];
}
