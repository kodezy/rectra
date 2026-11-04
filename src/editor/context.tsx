import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import {
  editorReducer,
  initialEditorState,
  type EditorAction,
  type EditorState,
} from "./reducer";

type EditorContextValue = {
  state: EditorState;
  dispatch: (action: EditorAction) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, undefined, initialEditorState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor outside EditorProvider");
  return ctx;
}
