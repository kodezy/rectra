import type { Project, Screen } from "./types";

export function normalizeName(name: string): string {
  return name.trim();
}

export function isNameEmpty(name: string): boolean {
  return normalizeName(name).length === 0;
}

export function isDuplicateName(names: string[], candidate: string, except?: string): boolean {
  const key = normalizeName(candidate).toLowerCase();
  return names.some((n) => {
    if (except && n === except) return false;
    return normalizeName(n).toLowerCase() === key;
  });
}

export function projectSlug(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "project";
}

export function nextSequentialName(prefix: string, existing: string[]): string {
  let max = 0;
  const re = new RegExp(`^${prefix}_(\\d+)$`, "i");
  for (const n of existing) {
    const m = re.exec(n);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}_${max + 1}`;
}

export function validateScreenName(
  project: Project,
  screenId: string,
  name: string,
): string | null {
  const n = normalizeName(name);
  if (isNameEmpty(n)) return "Name is required";
  const others = project.screens.filter((s) => s.id !== screenId).map((s) => s.name);
  if (isDuplicateName(others, n)) return "Name already in use";
  return null;
}

export function validateAnchorName(screen: Screen, anchorId: string, name: string): string | null {
  const n = normalizeName(name);
  if (isNameEmpty(n)) return "Name is required";
  const others = screen.anchors.filter((a) => a.id !== anchorId).map((a) => a.name);
  if (isDuplicateName(others, n)) return "Name already in use";
  return null;
}

export function validateComponentName(
  screen: Screen,
  componentId: string,
  name: string,
): string | null {
  const n = normalizeName(name);
  if (isNameEmpty(n)) return "Name is required";
  const others = screen.components.filter((c) => c.id !== componentId).map((c) => c.name);
  if (isDuplicateName(others, n)) return "Name already in use";
  return null;
}
