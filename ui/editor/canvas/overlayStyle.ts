export const overlaySelected = {
  color: "#FFFFFF",
  width: 2,
} as const;

const overlayAnchorIdle = {
  color: "#8D96A0",
  width: 1.5,
} as const;

const overlayAnchorActive = {
  color: "#B3BBC5",
  width: 1.5,
} as const;

const overlayPlacement = {
  color: "#AAB3BD",
  width: 1.5,
  dash: [6, 4] as number[],
};

export const overlayHandle = {
  size: 6,
  fill: "#FFFFFF",
} as const;

export const overlayLabel = {
  height: 19,
  gap: 2,
  paddingX: 7,
  paddingY: 3,
  radius: 3,
  fill: "#1E2229",
  stroke: "#48515B",
  strokeWidth: 1,
  fontSize: 11,
  fontFamily: "Inter",
  fontStyle: "500",
  text: "#F0F1F2",
  lineHeight: 1.2,
} as const;

export const overlayCornerRadius = 1;

type OverlayStroke = {
  color: string;
  width: number;
  dash?: number[];
};

export function overlayStroke(
  kind: "anchor" | "placement",
  selected: boolean,
  activeAnchor = false,
): OverlayStroke {
  if (selected) return { color: overlaySelected.color, width: overlaySelected.width };
  if (kind === "placement") {
    return {
      color: overlayPlacement.color,
      width: overlayPlacement.width,
      dash: overlayPlacement.dash,
    };
  }
  const tone = activeAnchor ? overlayAnchorActive : overlayAnchorIdle;
  return { color: tone.color, width: tone.width };
}
