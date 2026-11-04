import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage, Image as KonvaImage, Transformer } from "react-konva";
import type Konva from "konva";
import {
  clampRect,
  imagePointFromStage,
  rectFromDragEndpoints,
  type Rect as GeoRect,
} from "../../model/geometry";
import type { Screen } from "../../model/types";
import { useEditor } from "../context";

type Props = {
  screen: Screen;
  imageUrl: string | null;
  width: number;
  height: number;
  onCursor?: (point: { x: number; y: number } | null) => void;
};

export function EditorCanvas({ screen, imageUrl, width, height, onCursor }: Props) {
  const { state, dispatch } = useEditor();
  const [image] = useHtmlImage(imageUrl);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedNodeRef = useRef<Konva.Rect | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<GeoRect | null>(null);
  const [spacePan, setSpacePan] = useState(false);
  const panLast = useRef<{ x: number; y: number } | null>(null);

  const { scale, offsetX, offsetY } = state.viewport;
  const imageW = screen.image.width;
  const imageH = screen.image.height;

  const fit = useMemo(() => {
    if (width <= 0 || height <= 0) return { scale: 1, x: 0, y: 0 };
    const s = Math.min(width / imageW, height / imageH, 2);
    const x = (width - imageW * s) / 2;
    const y = (height - imageH * s) / 2;
    return { scale: s, x, y };
  }, [width, height, imageW, imageH]);

  const displayScale = scale * fit.scale;
  const imageX = fit.x + offsetX;
  const imageY = fit.y + offsetY;
  const panning = state.tool === "pan" || spacePan;
  const drawing = ["anchor", "component", "mapPlacement"].includes(state.tool);

  const activeAnchorId = state.activeAnchorId;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        setSpacePan(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpacePan(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const toImagePoint = (stageX: number, stageY: number) =>
    imagePointFromStage(stageX, stageY, imageX, imageY, displayScale);

  useEffect(() => {
    const onFit = () => {
      dispatch({ type: "SET_VIEWPORT", viewport: { scale: 1, offsetX: 0, offsetY: 0 } });
    };
    window.addEventListener("rectra:fit", onFit);
    return () => window.removeEventListener("rectra:fit", onFit);
  }, [dispatch]);

  const selection = state.selection;
  const selectedPlacement =
    selection.kind === "placement" && selection.screenId === screen.id ? selection : null;

  useEffect(() => {
    const tr = transformerRef.current;
    const node = selectedNodeRef.current;
    if (!tr) return;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selection, displayScale, imageX, imageY, state.showOverlays]);

  const placementsToShow = screen.components.flatMap((c) =>
    c.placements
      .filter((p) => p.anchorId === activeAnchorId)
      .map((p) => ({ component: c, placement: p })),
  );

  const finishDraw = (end: { x: number; y: number }) => {
    if (!drawStart) return;
    const rect = rectFromDragEndpoints(drawStart.x, drawStart.y, end.x, end.y, screen.image);
    setDrawStart(null);
    setDraftRect(null);
    if (!rect) return;

    if (state.tool === "anchor") {
      dispatch({ type: "CREATE_ANCHOR", screenId: screen.id, rect });
      return;
    }
    if (state.tool === "component" && activeAnchorId) {
      dispatch({
        type: "CREATE_COMPONENT",
        screenId: screen.id,
        anchorId: activeAnchorId,
        rect,
      });
      return;
    }
    if (state.tool === "mapPlacement" && state.pendingMap) {
      dispatch({
        type: "ADD_PLACEMENT",
        screenId: state.pendingMap.screenId,
        componentId: state.pendingMap.componentId,
        anchorId: state.pendingMap.anchorId,
        rect,
      });
    }
  };

  const commitTransform = (node: Konva.Rect, kind: "anchor" | "placement", ids: { anchorId: string; componentId?: string }) => {
    const rect = clampRect(
      {
        x: (node.x() - imageX) / displayScale,
        y: (node.y() - imageY) / displayScale,
        width: (node.width() * node.scaleX()) / displayScale,
        height: (node.height() * node.scaleY()) / displayScale,
      },
      screen.image,
    );
    node.scaleX(1);
    node.scaleY(1);
    if (kind === "anchor") {
      dispatch({
        type: "UPDATE_ANCHOR_RECT",
        screenId: screen.id,
        anchorId: ids.anchorId,
        rect,
      });
    } else if (ids.componentId) {
      dispatch({
        type: "UPDATE_PLACEMENT_RECT",
        screenId: screen.id,
        componentId: ids.componentId,
        anchorId: ids.anchorId,
        rect,
      });
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={{ cursor: panning ? "grab" : drawing ? "crosshair" : "default" }}
      onMouseDown={(e) => {
        if (panning) {
          panLast.current = { x: e.evt.clientX, y: e.evt.clientY };
          return;
        }
        if (!drawing) return;
        const pos = toImagePoint(e.evt.offsetX, e.evt.offsetY);
        setDrawStart(pos);
      }}
      onMouseMove={(e) => {
        const pos = toImagePoint(e.evt.offsetX, e.evt.offsetY);
        onCursor?.({ x: Math.round(pos.x), y: Math.round(pos.y) });
        if (panning && panLast.current) {
          const dx = e.evt.clientX - panLast.current.x;
          const dy = e.evt.clientY - panLast.current.y;
          panLast.current = { x: e.evt.clientX, y: e.evt.clientY };
          dispatch({
            type: "SET_VIEWPORT",
            viewport: { offsetX: offsetX + dx, offsetY: offsetY + dy },
          });
          return;
        }
        if (!drawStart) return;
        const rect = rectFromDragEndpoints(drawStart.x, drawStart.y, pos.x, pos.y, screen.image);
        setDraftRect(rect);
      }}
      onMouseUp={(e) => {
        panLast.current = null;
        if (!drawStart) return;
        const pos = toImagePoint(e.evt.offsetX, e.evt.offsetY);
        finishDraw(pos);
      }}
      onMouseLeave={() => {
        panLast.current = null;
        onCursor?.(null);
      }}
      onWheel={(e) => {
        if (!e.evt.ctrlKey && !e.evt.metaKey) return;
        e.evt.preventDefault();
        const dir = e.evt.deltaY > 0 ? -0.1 : 0.1;
        const next = Math.min(2, Math.max(0.5, Math.round((scale + dir) * 10) / 10));
        dispatch({ type: "SET_VIEWPORT", viewport: { scale: next } });
      }}
      onClick={(e) => {
        if (state.tool !== "select" || panning) return;
        if (e.target === e.target.getStage()) {
          dispatch({ type: "SET_SELECTION", selection: { kind: "screen", screenId: screen.id } });
        }
      }}
    >
      <Layer>
        {image && (
          <KonvaImage
            image={image}
            x={imageX}
            y={imageY}
            width={imageW * displayScale}
            height={imageH * displayScale}
            listening={false}
          />
        )}
        {state.showOverlays &&
          screen.anchors.map((anchor) => {
            const selected =
              selection.kind === "anchor" &&
              selection.anchorId === anchor.id &&
              selection.screenId === screen.id;
            return (
              <Rect
                key={anchor.id}
                ref={selected ? selectedNodeRef : undefined}
                x={imageX + anchor.rect.x * displayScale}
                y={imageY + anchor.rect.y * displayScale}
                width={anchor.rect.width * displayScale}
                height={anchor.rect.height * displayScale}
                stroke={selected ? "#FFFFFF" : "#949BA6"}
                strokeWidth={selected ? 2 : 1}
                fill="rgba(255,255,255,0.02)"
                onClick={(ev) => {
                  ev.cancelBubble = true;
                  dispatch({
                    type: "SET_SELECTION",
                    selection: { kind: "anchor", screenId: screen.id, anchorId: anchor.id },
                  });
                  dispatch({
                    type: "SET_ACTIVE_ANCHOR",
                    screenId: screen.id,
                    anchorId: anchor.id,
                  });
                }}
                onTransformEnd={(ev) => {
                  commitTransform(ev.target as Konva.Rect, "anchor", { anchorId: anchor.id });
                }}
              />
            );
          })}
        {state.showOverlays &&
          activeAnchorId &&
          placementsToShow.map(({ component, placement }) => {
            const selected =
              selectedPlacement?.componentId === component.id &&
              selectedPlacement.anchorId === placement.anchorId;
            return (
              <Rect
                key={`${component.id}-${placement.anchorId}`}
                ref={selected ? selectedNodeRef : undefined}
                x={imageX + placement.rect.x * displayScale}
                y={imageY + placement.rect.y * displayScale}
                width={placement.rect.width * displayScale}
                height={placement.rect.height * displayScale}
                stroke={selected ? "#FFFFFF" : "#949BA6"}
                strokeWidth={selected ? 2 : 1}
                dash={selected ? undefined : [6, 4]}
                fill="rgba(255,255,255,0.04)"
                draggable={state.tool === "select" && selected}
                onClick={(ev) => {
                  ev.cancelBubble = true;
                  dispatch({
                    type: "SET_SELECTION",
                    selection: {
                      kind: "placement",
                      screenId: screen.id,
                      anchorId: placement.anchorId,
                      componentId: component.id,
                    },
                  });
                }}
                onDragEnd={(ev) => {
                  const node = ev.target;
                  const x = (node.x() - imageX) / displayScale;
                  const y = (node.y() - imageY) / displayScale;
                  dispatch({
                    type: "UPDATE_PLACEMENT_RECT",
                    screenId: screen.id,
                    componentId: component.id,
                    anchorId: placement.anchorId,
                    rect: clampRect(
                      {
                        x,
                        y,
                        width: placement.rect.width,
                        height: placement.rect.height,
                      },
                      screen.image,
                    ),
                  });
                }}
                onTransformEnd={(ev) => {
                  commitTransform(ev.target as Konva.Rect, "placement", {
                    anchorId: placement.anchorId,
                    componentId: component.id,
                  });
                }}
              />
            );
          })}
        {draftRect && (
          <Rect
            x={imageX + draftRect.x * displayScale}
            y={imageY + draftRect.y * displayScale}
            width={draftRect.width * displayScale}
            height={draftRect.height * displayScale}
            stroke="#FFFFFF"
            dash={[4, 4]}
            listening={false}
          />
        )}
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          ignoreStroke
          borderStroke="#FFFFFF"
          borderStrokeWidth={2}
          anchorStroke="#FFFFFF"
          anchorFill="#101216"
          anchorSize={8}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
        />
      </Layer>
    </Stage>
  );
}

function useHtmlImage(url: string | null): [HTMLImageElement | undefined] {
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => {
    if (!url) {
      setImage(undefined);
      return;
    }
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = url;
  }, [url]);
  return [image];
}
