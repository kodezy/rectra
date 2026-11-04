import { useEffect, useState } from "react";
import { readFile } from "@tauri-apps/plugin-fs";
import { useEditor } from "../editor/context";
import { joinPath } from "../persistence/paths";

function screenImageBlob(bytes: Uint8Array): Blob {
  return new Blob([Uint8Array.from(bytes)]);
}

export function useImageUrlForScreen(screenId: string | null): string | null {
  const { state } = useEditor();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      if (!screenId) {
        setUrl(null);
        return;
      }
      const screen = state.project.screens.find((s) => s.id === screenId);
      if (!screen) {
        setUrl(null);
        return;
      }
      let bytes = state.screenImages[screenId]?.bytes;
      if (!bytes && state.projectDir && screen.image.path) {
        try {
          bytes = await readFile(joinPath(state.projectDir, screen.image.path));
        } catch {
          setUrl(null);
          return;
        }
      }
      if (!bytes) {
        setUrl(null);
        return;
      }
      const blob = screenImageBlob(bytes);
      objectUrl = URL.createObjectURL(blob);
      if (!cancelled) setUrl(objectUrl);
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [screenId, state.screenImages, state.projectDir, state.project.screens]);

  return url;
}

export function useActiveScreen() {
  const { state } = useEditor();
  const screenId = state.activeScreenId ?? state.project.screens[0]?.id ?? null;
  return state.project.screens.find((s) => s.id === screenId) ?? null;
}
