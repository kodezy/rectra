import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useEditor } from "../editor/context";
import type { DialogState } from "./dialogState";
import { handleDeleteSelection } from "./deleteActions";
import { isCompactWidth } from "./layout";

type UiContextValue = {
  explorerOpen: boolean;
  inspectorOpen: boolean;
  setExplorerOpen: (v: boolean) => void;
  setInspectorOpen: (v: boolean) => void;
  dialog: DialogState;
  setDialog: (d: DialogState) => void;
  explorerWidth: number | null;
  inspectorWidth: number | null;
  setExplorerWidth: (w: number | null) => void;
  setInspectorWidth: (w: number | null) => void;
  compact: boolean;
};

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [compact, setCompact] = useState(isCompactWidth(window.innerWidth));
  const [explorerWidth, setExplorerWidth] = useState<number | null>(null);
  const [inspectorWidth, setInspectorWidth] = useState<number | null>(null);

  useEffect(() => {
    const onResize = () => setCompact(isCompactWidth(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const value = useMemo(
    () => ({
      explorerOpen,
      inspectorOpen,
      setExplorerOpen,
      setInspectorOpen,
      dialog,
      setDialog,
      compact,
      explorerWidth,
      inspectorWidth,
      setExplorerWidth,
      setInspectorWidth,
    }),
    [explorerOpen, inspectorOpen, dialog, compact, explorerWidth, inspectorWidth],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi outside UiProvider");
  return ctx;
}

export { useActiveScreen, useImageUrlForScreen } from "./useScreenImageUrl";

export function useKeyboardShortcuts() {
  const { state, dispatch } = useEditor();
  const { setDialog, dialog } = useUi();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if (dialog.kind !== "none") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selection.kind === "none") return;
        e.preventDefault();
        handleDeleteSelection(state, dispatch, setDialog);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("rectra:save"));
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        dispatch({ type: "REDO" });
      } else if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }
      if (e.key === "v" || e.key === "V") dispatch({ type: "SET_TOOL", tool: "select" });
      if (e.key === "a" || e.key === "A") dispatch({ type: "SET_TOOL", tool: "anchor" });
      if (e.key === "c" || e.key === "C") {
        if (state.activeAnchorId) dispatch({ type: "SET_TOOL", tool: "component" });
      }
      if (e.key === "f" || e.key === "F") window.dispatchEvent(new CustomEvent("rectra:fit"));
      if (e.key === "Escape") {
        dispatch({ type: "SET_TOOL", tool: "select" });
        setDialog({ kind: "none" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, setDialog, state, dialog.kind]);
}
