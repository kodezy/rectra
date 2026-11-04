import type { Viewport } from "./reducer";

type Fit = {
  scale: number;
  x: number;
  y: number;
};

export function fitImageInHost(
  hostW: number,
  hostH: number,
  imageW: number,
  imageH: number,
): Fit {
  if (hostW <= 0 || hostH <= 0 || imageW <= 0 || imageH <= 0) {
    return { scale: 1, x: 0, y: 0 };
  }
  const scale = Math.min(hostW / imageW, hostH / imageH, 2);
  const x = (hostW - imageW * scale) / 2;
  const y = (hostH - imageH * scale) / 2;
  return { scale, x, y };
}

export function clampUserScale(scale: number): number {
  return Math.min(2, Math.max(0.5, Math.round(scale * 10) / 10));
}

export function zoomToward(
  viewport: Viewport,
  fit: Fit,
  pivot: { x: number; y: number },
  nextScale: number,
): Viewport {
  const scale = clampUserScale(nextScale);
  if (scale === viewport.scale) {
    return viewport;
  }
  const k = scale / viewport.scale;
  return {
    scale,
    offsetX: (pivot.x - fit.x) * (1 - k) + viewport.offsetX * k,
    offsetY: (pivot.y - fit.y) * (1 - k) + viewport.offsetY * k,
  };
}

export function stepUserScale(scale: number, direction: -1 | 1): number {
  return clampUserScale(scale + direction * 0.1);
}

export function clampViewportPan(
  viewport: Viewport,
  fit: Fit,
  hostW: number,
  hostH: number,
  imageW: number,
  imageH: number,
): Viewport {
  if (hostW <= 0 || hostH <= 0 || imageW <= 0 || imageH <= 0) {
    return viewport;
  }
  const displayScale = viewport.scale * fit.scale;
  const displayedW = imageW * displayScale;
  const displayedH = imageH * displayScale;
  const keepX = Math.min(displayedW, hostW / 2);
  const keepY = Math.min(displayedH, hostH / 2);
  const minImageX = keepX - displayedW;
  const maxImageX = hostW - keepX;
  const minImageY = keepY - displayedH;
  const maxImageY = hostH - keepY;
  const imageX = fit.x + viewport.offsetX;
  const imageY = fit.y + viewport.offsetY;
  const clampedX = Math.min(maxImageX, Math.max(minImageX, imageX));
  const clampedY = Math.min(maxImageY, Math.max(minImageY, imageY));
  const offsetX = clampedX - fit.x;
  const offsetY = clampedY - fit.y;
  if (offsetX === viewport.offsetX && offsetY === viewport.offsetY) {
    return viewport;
  }
  return { ...viewport, offsetX, offsetY };
}
