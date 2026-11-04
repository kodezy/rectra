import type { Project, Screen, ScreenImageMem } from "../model/types";
import { joinPath } from "./paths";

export function shouldWriteScreenAsset(
  screen: Screen,
  mem: ScreenImageMem | undefined,
): boolean {
  if (!mem) return false;
  if (mem.pendingWrite) return true;
  if (!screen.image.path.trim()) return true;
  return false;
}

export function nextScreenAssetPath(screenId: string, ext: string): string {
  const clean = ext.startsWith(".") ? ext.slice(1) : ext;
  return joinPath("assets", "screens", `${screenId}--${crypto.randomUUID()}.${clean}`);
}

export function applySavedScreenAssets(
  project: Project,
  screenImages: Record<string, ScreenImageMem>,
): Record<string, ScreenImageMem> {
  const next: Record<string, ScreenImageMem> = { ...screenImages };
  for (const screen of project.screens) {
    const mem = next[screen.id];
    if (mem) {
      next[screen.id] = { ...mem, pendingWrite: false };
    }
  }
  return next;
}

export function isExportMappingsDocument(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.formatVersion !== 1 || typeof o.projectId !== "string") return false;
  if (!Array.isArray(o.screens)) return false;
  const first = o.screens[0] as Record<string, unknown> | undefined;
  if (first && "image" in first) return false;
  if (first && "imageSize" in first) return true;
  return typeof o.projectName === "string";
}

export function isProjectDocument(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return o.formatVersion === 1 && typeof o.id === "string" && Array.isArray(o.screens);
}
