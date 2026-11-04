import {
  exists,
  mkdir,
  readDir,
  readFile,
  remove,
  rename,
  writeFile,
} from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import type { ScreenImageMem } from "../model/types";
import { projectSlug, validateProject, type Project } from "../model";
import type { EditorState } from "../editor/reducer";
import { joinPath } from "./paths";
import {
  applySavedScreenAssets,
  isExportMappingsDocument,
  nextScreenAssetPath,
  shouldWriteScreenAsset,
} from "./saveLogic";

export type LoadedProject = {
  project: Project;
  projectDir: string;
  screenImages: Record<string, ScreenImageMem>;
};

function extFromPath(path: string): string {
  const m = /\.(png|jpe?g)$/i.exec(path);
  return m ? m[1]!.toLowerCase().replace("jpeg", "jpg") : "png";
}

export async function pickOpenProjectDir(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Open project",
  });
  if (!selected || Array.isArray(selected)) return null;
  return selected;
}

export async function loadProjectFromDir(projectDir: string): Promise<LoadedProject> {
  const jsonPath = joinPath(projectDir, "project.json");
  if (!(await exists(jsonPath))) {
    throw new Error("project.json not found");
  }
  const bytes = await readFile(jsonPath);
  const text = new TextDecoder().decode(bytes);
  const parsed = JSON.parse(text) as unknown;
  if (isExportMappingsDocument(parsed)) {
    throw new Error("This file is an export package, not a Rectra project. Open a .rectra folder.");
  }
  const project = validateProject(parsed);

  const screenImages: LoadedProject["screenImages"] = {};
  for (const screen of project.screens) {
    const assetPath = joinPath(projectDir, screen.image.path);
    if (!(await exists(assetPath))) {
      throw new Error(`Missing image: ${screen.image.path}`);
    }
    const imgBytes = await readFile(assetPath);
    screenImages[screen.id] = {
      bytes: imgBytes,
      ext: extFromPath(screen.image.path),
      pendingWrite: false,
    };
  }

  return { project, projectDir, screenImages };
}

export async function pickSaveParentDir(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Choose folder for project",
  });
  if (!selected || Array.isArray(selected)) return null;
  return selected;
}

export async function saveProject(state: EditorState): Promise<{
  projectDir: string;
  project: Project;
  screenImages: Record<string, ScreenImageMem>;
}> {
  let projectDir = state.projectDir;
  if (!projectDir) {
    const parent = await pickSaveParentDir();
    if (!parent) throw new Error("Save cancelled");
    const slug = projectSlug(state.project.name);
    projectDir = joinPath(parent, `${slug}.rectra`);
    if (await exists(projectDir)) {
      throw new Error("Project folder already exists. Choose another name or folder.");
    }
    await mkdir(projectDir, { recursive: true });
    await mkdir(joinPath(projectDir, "assets", "screens"), { recursive: true });
  }

  const assetsDir = joinPath(projectDir, "assets", "screens");
  await mkdir(assetsDir, { recursive: true });

  const screens = [];
  for (const screen of state.project.screens) {
    const mem = state.screenImages[screen.id];
    let path = screen.image.path;
    if (mem && shouldWriteScreenAsset(screen, mem)) {
      path = nextScreenAssetPath(screen.id, mem.ext);
      const full = joinPath(projectDir, path);
      await writeFile(full, mem.bytes);
    }
    screens.push({
      ...screen,
      image: { ...screen.image, path },
    });
  }

  const project: Project = { ...state.project, screens };
  const tmpPath = joinPath(projectDir, "project.json.tmp");
  const jsonPath = joinPath(projectDir, "project.json");
  const json = `${JSON.stringify(project, null, 2)}\n`;
  await writeFile(tmpPath, new TextEncoder().encode(json));
  if (await exists(jsonPath)) {
    await remove(jsonPath);
  }
  await rename(tmpPath, jsonPath);

  if (await exists(jsonPath)) {
    const prev = state.project;
    const referenced = new Set(screens.map((s) => joinPath(projectDir!, s.image.path)));
    try {
      const entries = await readDir(assetsDir);
      for (const entry of entries) {
        if (!entry.isFile) continue;
        const full = joinPath(assetsDir, entry.name);
        if (!referenced.has(full)) {
          await remove(full);
        }
      }
    } catch {
      /* best effort */
    }
    void prev;
  }

  return {
    projectDir,
    project,
    screenImages: applySavedScreenAssets(project, state.screenImages),
  };
}

export async function pickImageFile(): Promise<{ bytes: Uint8Array; ext: string; name: string } | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg"] }],
    title: "Import screenshot",
  });
  if (!selected || Array.isArray(selected)) return null;
  const bytes = await readFile(selected);
  const name = selected.split(/[/\\]/).pop() ?? "screen";
  const ext = extFromPath(name);
  return { bytes, ext, name: name.replace(/\.[^.]+$/, "") };
}

export function decodeImageDimensions(bytes: Uint8Array): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)]));
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Invalid image"));
    };
    img.src = url;
  });
}

export async function pickExportDir(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Export mappings",
  });
  if (!selected || Array.isArray(selected)) return null;
  return selected;
}
