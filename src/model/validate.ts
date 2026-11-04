import type { Rect } from "./types";
import { isRectValid } from "./geometry";
import { isDuplicateName, isNameEmpty, normalizeName } from "./names";
import type { Component, Project, Screen } from "./types";

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

function assertKnownFormatVersion(v: unknown): asserts v is 1 {
  if (v !== 1) throw new ProjectValidationError("Unsupported formatVersion");
}

export function validateProject(raw: unknown): Project {
  if (!raw || typeof raw !== "object") {
    throw new ProjectValidationError("Invalid project JSON");
  }
  const p = raw as Record<string, unknown>;
  assertKnownFormatVersion(p.formatVersion);
  if (typeof p.id !== "string" || typeof p.name !== "string") {
    throw new ProjectValidationError("Missing project id or name");
  }
  if (!Array.isArray(p.screens)) {
    throw new ProjectValidationError("screens must be an array");
  }

  const screenIds = new Set<string>();
  const screenNames: string[] = [];

  const screens: Screen[] = p.screens.map((s) => validateScreen(s, screenIds, screenNames));

  return {
    formatVersion: 1,
    id: p.id,
    name: p.name,
    screens,
  };
}

function validateScreen(
  raw: unknown,
  screenIds: Set<string>,
  screenNames: string[],
): Screen {
  if (!raw || typeof raw !== "object") {
    throw new ProjectValidationError("Invalid screen");
  }
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string") throw new ProjectValidationError("Screen missing id");
  if (screenIds.has(s.id)) throw new ProjectValidationError("Duplicate screen id");
  screenIds.add(s.id);
  if (typeof s.name !== "string" || isNameEmpty(s.name)) {
    throw new ProjectValidationError("Screen name required");
  }
  if (isDuplicateName(screenNames, s.name)) {
    throw new ProjectValidationError("Duplicate screen name");
  }
  screenNames.push(normalizeName(s.name));

  const image = s.image as Record<string, unknown>;
  if (!image || typeof image.path !== "string") {
    throw new ProjectValidationError("Screen image.path required");
  }
  if (image.path.includes("..") || image.path.startsWith("/")) {
    throw new ProjectValidationError("Invalid image path");
  }
  const width = Number(image.width);
  const height = Number(image.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new ProjectValidationError("Invalid image dimensions");
  }

  const bounds = { width, height };
  const anchorIds = new Set<string>();
  const anchorNames: string[] = [];
  const anchors = (s.anchors as unknown[] | undefined)?.map((a) =>
    validateAnchor(a, anchorIds, anchorNames, bounds),
  ) ?? [];

  const componentIds = new Set<string>();
  const componentNames: string[] = [];
  const components = (s.components as unknown[] | undefined)?.map((c) =>
    validateComponent(c, componentIds, componentNames, anchorIds, bounds),
  ) ?? [];

  return {
    id: s.id,
    name: normalizeName(s.name),
    image: { path: image.path, width, height },
    anchors,
    components,
  };
}

function validateAnchor(
  raw: unknown,
  ids: Set<string>,
  names: string[],
  bounds: { width: number; height: number },
) {
  if (!raw || typeof raw !== "object") throw new ProjectValidationError("Invalid anchor");
  const a = raw as Record<string, unknown>;
  if (typeof a.id !== "string") throw new ProjectValidationError("Anchor missing id");
  if (ids.has(a.id)) throw new ProjectValidationError("Duplicate anchor id");
  ids.add(a.id);
  if (typeof a.name !== "string" || isNameEmpty(a.name)) {
    throw new ProjectValidationError("Anchor name required");
  }
  if (isDuplicateName(names, a.name)) {
    throw new ProjectValidationError("Duplicate anchor name");
  }
  names.push(normalizeName(a.name));
  const rect = a.rect as Record<string, number>;
  if (!isRectValid(rect as Rect, bounds)) throw new ProjectValidationError("Invalid anchor rect");
  return { id: a.id, name: normalizeName(a.name), rect: rect as Rect };
}

function validateComponent(
  raw: unknown,
  ids: Set<string>,
  names: string[],
  anchorIds: Set<string>,
  bounds: { width: number; height: number },
): Component {
  if (!raw || typeof raw !== "object") throw new ProjectValidationError("Invalid component");
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string") throw new ProjectValidationError("Component missing id");
  if (ids.has(c.id)) throw new ProjectValidationError("Duplicate component id");
  ids.add(c.id);
  if (typeof c.name !== "string" || isNameEmpty(c.name)) {
    throw new ProjectValidationError("Component name required");
  }
  if (isDuplicateName(names, c.name)) {
    throw new ProjectValidationError("Duplicate component name");
  }
  names.push(normalizeName(c.name));
  if (c.type !== "coord" && c.type !== "bbox") {
    throw new ProjectValidationError("Invalid component type");
  }
  if (!Array.isArray(c.placements) || c.placements.length < 1) {
    throw new ProjectValidationError("Component must have at least one placement");
  }
  const pairs = new Set<string>();
  const placements = c.placements.map((pl) => {
    if (!pl || typeof pl !== "object") throw new ProjectValidationError("Invalid placement");
    const p = pl as Record<string, unknown>;
    if (typeof p.anchorId !== "string" || !anchorIds.has(p.anchorId)) {
      throw new ProjectValidationError("Placement references unknown anchor");
    }
    const key = `${c.id}:${p.anchorId}`;
    if (pairs.has(key)) throw new ProjectValidationError("Duplicate placement for anchor");
    pairs.add(key);
    const rect = p.rect as Record<string, number>;
    if (!isRectValid(rect as Rect, bounds)) throw new ProjectValidationError("Invalid placement rect");
    return { anchorId: p.anchorId, rect: rect as Rect };
  });

  return {
    id: c.id,
    name: normalizeName(c.name),
    type: c.type,
    placements,
  };
}

export function isExportMappingsJson(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.formatVersion !== 1) return false;
  return typeof o.projectId === "string" && Array.isArray(o.screens);
}
