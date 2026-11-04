import { useEffect, useRef, useState } from "react";
import { EditorCanvas } from "../editor/canvas/EditorCanvas";
import { useEditor } from "../editor/context";
import { projectHasAnchor } from "../model";
import { DialogLayer } from "./Dialogs";
import { Explorer } from "./Explorer";
import { FooterBar, Toolbar } from "./Toolbar";
import { Toolrail } from "./Toolrail";
import { Header } from "./Header";
import { Inspector } from "./Inspector";
import { Button } from "./components/Button";
import { Logo } from "./Logo";
import { PanelResizer } from "./PanelResizer";
import { explorerDefaultWidth, inspectorDefaultWidth } from "./layout";
import { registerSaveHandler, triggerSave } from "./saveBridge";
import { useUnsavedGuard } from "./useUnsavedGuard";
import {
  useActiveScreen,
  useImageUrlForScreen,
} from "./useScreenImageUrl";
import { useKeyboardShortcuts, useUi } from "./ui-context";
import {
  decodeImageDimensions,
  loadProjectFromDir,
  pickImageFile,
  pickOpenProjectDir,
  saveProject,
} from "../persistence/project";

export function Workspace() {
  const { state, dispatch } = useEditor();
  const stateRef = useRef(state);
  stateRef.current = state;
  const {
    compact,
    explorerOpen,
    inspectorOpen,
    explorerWidth,
    inspectorWidth,
    setExplorerWidth,
    setInspectorWidth,
    setDialog,
    dialog,
  } = useUi();
  const guardUnsaved = useUnsavedGuard();
  const screen = useActiveScreen();
  const imageUrl = useImageUrlForScreen(screen?.id ?? null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useKeyboardShortcuts();

  const defaultExplorer = explorerDefaultWidth(compact);
  const defaultInspector = inspectorDefaultWidth(compact);
  const explorerPx = explorerWidth ?? defaultExplorer;
  const inspectorPx = inspectorWidth ?? defaultInspector;

  useEffect(() => {
    registerSaveHandler(async () => {
      try {
        const { projectDir, project, screenImages } = await saveProject(stateRef.current);
        dispatch({
          type: "SET_PROJECT",
          project,
          projectDir,
          dirty: false,
          screenImages,
        });
        dispatch({ type: "MARK_SAVED", projectDir });
        return true;
      } catch (e) {
        window.alert(e instanceof Error ? e.message : String(e));
        return false;
      }
    });
  }, [dispatch]);

  useEffect(() => {
    const el = canvasHostRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) setCanvasSize({ width: cr.width, height: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [explorerOpen, inspectorOpen, explorerPx, inspectorPx]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/window")
      .then(({ getCurrentWindow }) =>
        getCurrentWindow().onCloseRequested((event) => {
          if (!stateRef.current.dirty) return;
          event.preventDefault();
          guardUnsaved(() => {
            void getCurrentWindow().close();
          });
        }),
      )
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => undefined);
    return () => unlisten?.();
  }, [guardUnsaved]);

  useEffect(() => {
    const onNew = () => {
      guardUnsaved(() => {
        dispatch({ type: "NEW_PROJECT" });
      });
    };

    const onOpen = () => {
      guardUnsaved(async () => {
        const dir = await pickOpenProjectDir();
        if (!dir) return;
        try {
          const loaded = await loadProjectFromDir(dir);
          dispatch({
            type: "SET_PROJECT",
            project: loaded.project,
            projectDir: loaded.projectDir,
            dirty: false,
            screenImages: loaded.screenImages,
          });
          dispatch({ type: "MARK_SAVED", projectDir: dir });
        } catch (e) {
          window.alert(e instanceof Error ? e.message : String(e));
        }
      });
    };

    const onReplace = async () => {
      if (!screen) return;
      const picked = await pickImageFile();
      if (!picked) return;
      const dims = await decodeImageDimensions(picked.bytes);
      if (dims.width !== screen.image.width || dims.height !== screen.image.height) {
        window.alert("Image size must match the current screen. Create a new screen instead.");
        return;
      }
      setDialog({
        kind: "confirmReplace",
        title: "Replace image",
        message: "Replace the screenshot and keep current coordinates?",
        onConfirm: () => {
          dispatch({
            type: "REPLACE_SCREEN_IMAGE",
            screenId: screen.id,
            bytes: picked.bytes,
            ext: picked.ext,
          });
        },
      });
    };

    const onSaveEvent = () => {
      void triggerSave();
    };

    const onExport = () => {
      if (projectHasAnchor(stateRef.current.project)) {
        setDialog({ kind: "export" });
      }
    };

    window.addEventListener("rectra:new", onNew);
    window.addEventListener("rectra:save", onSaveEvent);
    window.addEventListener("rectra:open", onOpen);
    window.addEventListener("rectra:export", onExport);
    window.addEventListener("rectra:replace-image", onReplace);
    return () => {
      window.removeEventListener("rectra:new", onNew);
      window.removeEventListener("rectra:save", onSaveEvent);
      window.removeEventListener("rectra:open", onOpen);
      window.removeEventListener("rectra:export", onExport);
      window.removeEventListener("rectra:replace-image", onReplace);
    };
  }, [dispatch, guardUnsaved, screen, setDialog]);

  return (
    <div className="flex h-full flex-col bg-background">
      <Header />
      <div className="flex min-h-0 flex-1">
        {explorerOpen && (
          <>
            <div className="shrink-0 overflow-hidden" style={{ width: explorerPx }}>
              <Explorer />
            </div>
            <PanelResizer
              onResize={(dx) =>
                setExplorerWidth(Math.min(320, Math.max(160, explorerPx + dx)))
              }
              onReset={() => setExplorerWidth(null)}
            />
          </>
        )}
        <main className="flex min-w-0 flex-1 flex-col bg-canvas">
          {screen && <Toolbar canvasSize={canvasSize} />}
          <div ref={canvasHostRef} className="relative min-h-0 flex-1 bg-canvas">
            {!screen ? (
              <EmptyWorkspace onImport={() => void importFirstScreen(dispatch)} />
            ) : (
              <>
                <EditorCanvas
                  screen={screen}
                  imageUrl={imageUrl}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  canvasLocked={dialog.kind !== "none"}
                />
                <Toolrail />
              </>
            )}
          </div>
        </main>
        {inspectorOpen && screen && (
          <>
            <PanelResizer
              onResize={(dx) =>
                setInspectorWidth(Math.min(360, Math.max(200, inspectorPx - dx)))
              }
              onReset={() => setInspectorWidth(null)}
            />
            <div className="shrink-0 overflow-hidden" style={{ width: inspectorPx }}>
              <Inspector />
            </div>
          </>
        )}
      </div>
      <FooterBar />
      <DialogLayer />
    </div>
  );
}

async function importFirstScreen(dispatch: ReturnType<typeof useEditor>["dispatch"]) {
  const picked = await pickImageFile();
  if (!picked) return;
  const dims = await decodeImageDimensions(picked.bytes);
  dispatch({
    type: "ADD_SCREEN",
    screen: {
      id: crypto.randomUUID(),
      name: picked.name || "Overview",
      image: { path: "", width: dims.width, height: dims.height },
      anchors: [],
      components: [],
    },
    imageBytes: picked.bytes,
    ext: picked.ext,
  });
}

function EmptyWorkspace({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex h-full items-center justify-center bg-canvas">
      <div className="text-center">
        <div className="mx-auto flex h-[100px] w-[110px] items-center justify-center rounded-[16px] bg-input text-text">
          <Logo size={26} />
        </div>
        <p className="mt-10 text-[24px] font-semibold">No screens</p>
        <p className="mt-3 text-[14px] text-muted">Import a screenshot to start mapping.</p>
        <Button variant="primary" className="mx-auto mt-8 h-[42px] w-[215px] text-[13px]" onClick={onImport}>
          Import
        </Button>
        <p className="mt-4 text-[12px] text-subtle">PNG or JPEG</p>
      </div>
    </div>
  );
}
