import { useEditor } from "../editor/context";
import { totalMappingsOnScreen } from "@core/editor/reducer";
import { clampViewportPan, fitImageInHost, stepUserScale, zoomToward } from "@core/editor/viewport";
import { ToolButton } from "./components/Button";
import { CANVAS_TOOLBAR_HEIGHT, FOOTER_HEIGHT } from "./layout";
import { useActiveScreen } from "./ui-context";

type ToolbarProps = {
  canvasSize: { width: number; height: number };
};

export function Toolbar({ canvasSize }: ToolbarProps) {
  const { state, dispatch } = useEditor();
  const screen = useActiveScreen();

  const zoomStep = (direction: -1 | 1) => {
    if (!screen) return;
    const fit = fitImageInHost(
      canvasSize.width,
      canvasSize.height,
      screen.image.width,
      screen.image.height,
    );
    const pivot = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const zoomed = zoomToward(
      state.viewport,
      fit,
      pivot,
      stepUserScale(state.viewport.scale, direction),
    );
    if (zoomed === state.viewport) return;
    dispatch({
      type: "SET_VIEWPORT",
      viewport: clampViewportPan(
        zoomed,
        fit,
        canvasSize.width,
        canvasSize.height,
        screen.image.width,
        screen.image.height,
      ),
    });
  };

  return (
    <div
      className="flex shrink-0 items-center justify-end border-b border-border bg-surface px-4"
      style={{ height: CANVAS_TOOLBAR_HEIGHT }}
    >
      <ToolButton
        active={state.showOverlays}
        className={state.showOverlays ? "border border-border" : ""}
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
        onClick={() => zoomStep(-1)}
      >
        −
      </button>
      <span className="min-w-[36px] text-center text-[12px] text-muted">
        {Math.round(state.viewport.scale * 100)}%
      </span>
      <button
        type="button"
        className="px-2 text-[12px] text-muted hover:text-text"
        onClick={() => zoomStep(1)}
      >
        +
      </button>
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
