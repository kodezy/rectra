import { exists, mkdir, readDir, readFile, remove, rename, writeFile } from "@tauri-apps/plugin-fs";
import { buildExportMappings, projectHasAnchor } from "../model";
import type { EditorState } from "../editor/reducer";
import { joinPath } from "./paths";

function parentDir(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx <= 0 ? path : path.slice(0, idx);
}

export async function isRecognizedExportDir(dir: string): Promise<boolean> {
  const mapPath = joinPath(dir, "mappings.json");
  if (!(await exists(mapPath))) return false;
  try {
    const bytes = await readFile(mapPath);
    const o = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    if (o.formatVersion !== 1 || typeof o.projectId !== "string") return false;
    if (!Array.isArray(o.screens)) return false;
    const first = o.screens[0] as Record<string, unknown> | undefined;
    if (first && "image" in first) return false;
    const templates = joinPath(dir, "templates");
    if (!(await exists(templates))) return false;
    const rootEntries = await readDir(dir);
    for (const e of rootEntries) {
      if (e.isDirectory && e.name !== "templates") return false;
      if (!e.isDirectory && e.name !== "mappings.json") return false;
    }
    const templateEntries = await readDir(templates);
    for (const e of templateEntries) {
      if (e.isDirectory) return false;
      if (!e.name.toLowerCase().endsWith(".png")) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function cropAnchorToPng(
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("PNG encode failed"));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });
}

async function loadScreenImage(
  state: EditorState,
  screenId: string,
  imagePath: string,
): Promise<HTMLImageElement> {
  let bytes: Uint8Array | undefined = state.screenImages[screenId]?.bytes;
  if (!bytes && state.projectDir) {
    bytes = await readFile(joinPath(state.projectDir, imagePath));
  }
  if (!bytes) throw new Error("Screenshot not available for export");
  const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)]));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode screenshot"));
    };
    img.src = url;
  });
}

export async function exportMappingsPackage(
  state: EditorState,
  destDir: string,
  replaceConfirmed: boolean,
): Promise<void> {
  if (!projectHasAnchor(state.project)) {
    throw new Error("Export requires at least one anchor");
  }

  const destExists = await exists(destDir);
  if (destExists) {
    const entries = await readDir(destDir);
    const empty = entries.length === 0;
    if (!empty) {
      const recognized = await isRecognizedExportDir(destDir);
      if (!recognized) {
        throw new Error("Destination contains unknown files. Choose an empty folder.");
      }
      if (!replaceConfirmed) {
        throw new Error("NEEDS_REPLACE_CONFIRM");
      }
    }
  }

  const staging = joinPath(parentDir(destDir), `.rectra-export-${crypto.randomUUID()}`);
  await mkdir(joinPath(staging, "templates"), { recursive: true });

  const mappings = buildExportMappings(state.project);
  await writeFile(
    joinPath(staging, "mappings.json"),
    new TextEncoder().encode(`${JSON.stringify(mappings, null, 2)}\n`),
  );

  for (const screen of state.project.screens) {
    const img = await loadScreenImage(state, screen.id, screen.image.path);
    for (const anchor of screen.anchors) {
      const { x, y, width, height } = anchor.rect;
      const png = await cropAnchorToPng(img, x, y, width, height);
      await writeFile(joinPath(staging, "templates", `${anchor.id}.png`), png);
    }
  }

  if (destExists) {
    const entries = await readDir(destDir);
    if (entries.length === 0) {
      await remove(destDir);
    } else {
      const backup = joinPath(parentDir(destDir), `.rectra-backup-${Date.now()}`);
      await rename(destDir, backup);
      try {
        await rename(staging, destDir);
        await remove(backup, { recursive: true });
        return;
      } catch (e) {
        await rename(backup, destDir);
        throw e;
      }
    }
  }

  await mkdir(destDir, { recursive: true });
  await rename(staging, destDir);
}
