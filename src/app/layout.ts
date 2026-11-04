export const HEADER_HEIGHT = 56;
export const FOOTER_HEIGHT = 28;
export const EXPLORER_WIDTH = 240;
export const EXPLORER_WIDTH_COMPACT = 208;
export const INSPECTOR_WIDTH = 296;
export const INSPECTOR_WIDTH_COMPACT = 256;
export const COMPACT_BREAKPOINT = 1280;

export function isCompactWidth(windowWidth: number): boolean {
  return windowWidth < COMPACT_BREAKPOINT;
}

export function explorerDefaultWidth(compact: boolean): number {
  return compact ? EXPLORER_WIDTH_COMPACT : EXPLORER_WIDTH;
}

export function inspectorDefaultWidth(compact: boolean): number {
  return compact ? INSPECTOR_WIDTH_COMPACT : INSPECTOR_WIDTH;
}
