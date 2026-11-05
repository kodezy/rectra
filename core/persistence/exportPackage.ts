import { exists, mkdir, readDir, readFile, remove, rename, writeFile } from "@tauri-apps/plugin-fs";
import { buildExportMappings, projectHasAnchor } from "../model";
import type { EditorState } from "../editor/reducer";
import { joinPath } from "./paths";
import { isExportMappingsDocument } from "./saveLogic";

const stagingPrefix = "rectra-export-";
const backupPrefix = "rectra-backup-";
const stagingDirName = new RegExp(
  `^${stagingPrefix}[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`,
  "i",
);
const backupDirName = new RegExp(`^${backupPrefix}\\d+$`);

function isExportStagingName(name: string): boolean {
  return stagingDirName.test(name);
}

function isExportBackupName(name: string): boolean {
  return backupDirName.test(name);
}

export type ExportDirFs = {
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string) => Promise<void>;
  readDir: (path: string) => Promise<Array<{ name: string; isDirectory: boolean }>>;
  remove: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  rename: (from: string, to: string) => Promise<void>;
};

export function exportStagingDir(destDir: string, id: string): string {
  return joinPath(destDir, `${stagingPrefix}${id}`);
}

export function exportBackupDir(destDir: string, stamp: string): string {
  return joinPath(destDir, `${backupPrefix}${stamp}`);
}

export async function isRecognizedExportDir(dir: string): Promise<boolean> {
  const mapPath = joinPath(dir, "mappings.json");
  if (!(await exists(mapPath))) return false;
  try {
    const bytes = await readFile(mapPath);
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isExportMappingsDocument(parsed)) return false;
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

export async function recoverExportDir(destDir: string, fs: ExportDirFs): Promise<void> {
  if (!(await fs.exists(destDir))) return;

  const entries = await fs.readDir(destDir);
  const managed = entries.every(
    (entry) =>
      entry.name === "mappings.json" ||
      entry.name === "templates" ||
      isExportStagingName(entry.name) ||
      isExportBackupName(entry.name),
  );
  if (!managed) return;

  for (const entry of entries) {
    if (entry.isDirectory && isExportStagingName(entry.name)) {
      await fs.remove(joinPath(destDir, entry.name), { recursive: true });
    }
  }

  const mappings = joinPath(destDir, "mappings.json");
  const templates = joinPath(destDir, "templates");
  const rootMappings = await fs.exists(mappings);
  const rootTemplates = await fs.exists(templates);
  const backups = entries.filter(
    (entry) => entry.isDirectory && isExportBackupName(entry.name),
  );

  if (rootMappings && rootTemplates) {
    for (const backup of backups) {
      await fs.remove(joinPath(destDir, backup.name), { recursive: true });
    }
    return;
  }

  if (backups.length !== 1) return;

  const backupDir = joinPath(destDir, backups[0]!.name);
  const backupMappings = joinPath(backupDir, "mappings.json");
  const backupTemplates = joinPath(backupDir, "templates");
  const backupHasMappings = await fs.exists(backupMappings);
  const backupHasTemplates = await fs.exists(backupTemplates);
  if (!backupHasMappings && !backupHasTemplates) return;

  if (backupHasMappings && rootMappings) await fs.remove(mappings);
  if (backupHasTemplates && rootTemplates) await fs.remove(templates, { recursive: true });
  if (backupHasMappings && !(await fs.exists(mappings))) await fs.rename(backupMappings, mappings);
  if (backupHasTemplates && !(await fs.exists(templates))) {
    await fs.rename(backupTemplates, templates);
  }

  if ((await fs.exists(mappings)) && (await fs.exists(templates))) {
    await fs.remove(backupDir, { recursive: true });
  }
}

async function moveIfPresent(fs: ExportDirFs, from: string, to: string): Promise<void> {
  if (await fs.exists(from)) await fs.rename(from, to);
}

export async function commitExportDirectory(
  destDir: string,
  stagingDir: string,
  fs: ExportDirFs,
): Promise<void> {
  if (!(await fs.exists(destDir))) await fs.mkdir(destDir);

  const destMappings = joinPath(destDir, "mappings.json");
  const destTemplates = joinPath(destDir, "templates");
  const stagedMappings = joinPath(stagingDir, "mappings.json");
  const stagedTemplates = joinPath(stagingDir, "templates");
  const hadPackage = await fs.exists(destMappings);
  const backupDir = hadPackage ? exportBackupDir(destDir, String(Date.now())) : null;
  const backupMappings = backupDir ? joinPath(backupDir, "mappings.json") : null;
  const backupTemplates = backupDir ? joinPath(backupDir, "templates") : null;

  let backedMappings = false;
  let backedTemplates = false;
  let placedMappings = false;
  let placedTemplates = false;

  try {
    if (backupDir && backupMappings && backupTemplates) {
      await fs.mkdir(backupDir);
      await fs.rename(destMappings, backupMappings);
      backedMappings = true;
      await fs.rename(destTemplates, backupTemplates);
      backedTemplates = true;
    }

    await fs.rename(stagedMappings, destMappings);
    placedMappings = true;
    await fs.rename(stagedTemplates, destTemplates);
    placedTemplates = true;
    await fs.remove(stagingDir, { recursive: true });
    if (backupDir) await fs.remove(backupDir, { recursive: true });
  } catch (error) {
    if ((placedMappings || placedTemplates) && !(await fs.exists(stagingDir))) {
      await fs.mkdir(stagingDir);
    }
    if (placedTemplates) await moveIfPresent(fs, destTemplates, stagedTemplates);
    if (placedMappings) await moveIfPresent(fs, destMappings, stagedMappings);
    if (backedTemplates && backupTemplates) await moveIfPresent(fs, backupTemplates, destTemplates);
    if (backedMappings && backupMappings) await moveIfPresent(fs, backupMappings, destMappings);
    if (backupDir && (await fs.exists(backupDir))) await fs.remove(backupDir, { recursive: true });
    if (await fs.exists(stagingDir)) await fs.remove(stagingDir, { recursive: true });
    throw error;
  }
}

export async function exportMappingsPackage(
  state: EditorState,
  destDir: string,
  replaceConfirmed: boolean,
): Promise<void> {
  if (!projectHasAnchor(state.project)) {
    throw new Error("Export requires at least one anchor");
  }

  const destExisted = await exists(destDir);
  if (destExisted) {
    await recoverExportDir(destDir, { exists, mkdir, readDir, remove, rename });
    const entries = await readDir(destDir);
    if (entries.length > 0) {
      const recognized = await isRecognizedExportDir(destDir);
      if (!recognized) {
        throw new Error("Destination contains unknown files. Choose an empty folder.");
      }
      if (!replaceConfirmed) {
        throw new Error("NEEDS_REPLACE_CONFIRM");
      }
    }
  } else {
    await mkdir(destDir, { recursive: true });
  }

  const staging = exportStagingDir(destDir, crypto.randomUUID());
  try {
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

    await commitExportDirectory(destDir, staging, { exists, mkdir, readDir, remove, rename });
  } catch (error) {
    if (!destExisted && (await exists(destDir))) {
      await remove(destDir, { recursive: true });
    } else if (await exists(staging)) {
      await remove(staging, { recursive: true });
    }
    throw error;
  }
}
