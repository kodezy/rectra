import { useCallback } from "react";
import { useEditor } from "../editor/context";
import { triggerSave } from "./saveBridge";
import { useUi } from "./ui-context";

export function useUnsavedGuard() {
  const { state, dispatch } = useEditor();
  const { setDialog } = useUi();

  return useCallback(
    (thenRun: () => void | Promise<void>) => {
      if (!state.dirty) {
        void thenRun();
        return;
      }
      setDialog({
        kind: "unsaved",
        onResolve: async (choice) => {
          if (choice === "cancel") {
            setDialog({ kind: "none" });
            return;
          }
          if (choice === "save") {
            const ok = await triggerSave();
            if (!ok) return;
          }
          if (choice === "discard") {
            dispatch({ type: "DISCARD_SESSION" });
          }
          setDialog({ kind: "none" });
          await thenRun();
        },
      });
    },
    [dispatch, setDialog, state.dirty],
  );
}
