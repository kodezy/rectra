import { useEditor } from "../editor/context";
import { totalMappingsOnScreen } from "../editor/reducer";
import { ToolButton } from "./components/Button";
import { FOOTER_HEIGHT } from "./layout";
import { useActiveScreen } from "./ui-context";

export function Toolbar() {
  const { state, dispatch } = useEditor();
  const componentDisabled = !state.activeAnchorId;
  const componentActive = state.tool === "component" || state.tool === "mapPlacement";

  return (
    <div className="flex h-[50px] shrink-0 items-center border-b border-border bg-canvas px-4">
      <ToolButton
        active={state.tool === "select"}
        title="Select (V)"
        onClick={() => dispatch({ type: "SET_TOOL", tool: "select" })}
      >
        Select
      </ToolButton>
      <ToolButton
        active={state.tool === "anchor"}
        title="Anchor (A)"
        onClick={() => dispatch({ type: "SET_TOOL", tool: "anchor" })}
      >
        Anchor
      </ToolButton>
      <ToolButton
        active={componentActive}
        disabled={componentDisabled}
        title={componentDisabled ? "Select an anchor first" : "Component (C)"}
        onClick={() => dispatch({ type: "SET_TOOL", tool: "component" })}
      >
        Component
      </ToolButton>
      <ToolButton
        active={state.tool === "pan"}
        title="Pan (Space)"
        onClick={() => dispatch({ type: "SET_TOOL", tool: "pan" })}
      >
        Pan
      </ToolButton>
      <div className="ml-auto flex items-center">
        <ToolButton
          active={state.showOverlays}
          onClick={() => dispatch({ type: "TOGGLE_OVERLAYS" })}
        >
          Overlays
        </ToolButton>
        <ToolButton title="Fit (F)" onClick={() => window.dispatchEvent(new CustomEvent("rectra:fit"))}>
          Fit
        </ToolButton>
        <button
          type="button"
          className="px-2 text-[12px] text-muted hover:text-text"
          onClick={() =>
            dispatch({
              type: "SET_VIEWPORT",
              viewport: { scale: Math.max(0.5, Math.round((state.viewport.scale - 0.1) * 10) / 10) },
            })
          }
        >
          −
        </button>
        <span className="min-w-[36px] text-center text-[12px] text-muted">
          {Math.round(state.viewport.scale * 100)}%
        </span>
        <button
          type="button"
          className="px-2 text-[12px] text-muted hover:text-text"
          onClick={() =>
            dispatch({
              type: "SET_VIEWPORT",
              viewport: { scale: Math.min(2, Math.round((state.viewport.scale + 0.1) * 10) / 10) },
            })
          }
        >
          +
        </button>
      </div>
    </div>
  );
}

export function FooterBar() {
  const { state } = useEditor();
  const screen = useActiveScreen();
  const mappings = screen ? totalMappingsOnScreen(screen) : 0;
  const anchorName = screen?.anchors.find((a) => a.id === state.activeAnchorId)?.name ?? "—";

  return (
    <footer
      className="flex shrink-0 items-center justify-between border-t border-border bg-surface px-[17px] text-[11px] text-muted"
      style={{ height: FOOTER_HEIGHT }}
    >
      <span>
        {screen
          ? `${screen.image.width} × ${screen.image.height}     •     ${Math.round(state.viewport.scale * 100)}%     •     ${anchorName}     •     ${mappings} mappings`
          : "No image loaded"}
      </span>
      <span>{state.saveStatus === "saved" ? "Saved" : "Unsaved project"}</span>
    </footer>
  );
}
