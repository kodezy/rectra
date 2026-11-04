import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage, Image as KonvaImage, Transformer } from "react-konva";
import type Konva from "konva";
import {
  clampRect,
  imagePointFromStage,
  rectFromDragEndpoints,
  type Rect as GeoRect,
} from "@core/model/geometry";
import type { Screen } from "@core/model/types";
import { useEditor } from "../context";
import type { Viewport } from "@core/editor/reducer";
import {
  clampViewportPan,
  fitImageInHost,
  stepUserScale,
  zoomToward,
} from "@core/editor/viewport";
import { OverlayLabel } from "./OverlayLabel";
import {
  overlayCornerRadius,
  overlayHandle,
  overlaySelected,
  overlayStroke,
} from "./overlayStyle";

type Props = {
  screen: Screen;
  imageUrl: string | null;
  width: number;
  height: number;
  canvasLocked?: boolean;
  onCursor?: (point: { x: number; y: number } | null) => void;
};

export function EditorCanvas({
  screen,
  imageUrl,
  width,
  height,
  canvasLocked = false,
  onCursor,
}: Props) {
  const { state, dispatch } = useEditor();
  const [image] = useHtmlImage(imageUrl);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedNodeRef = useRef<Konva.Rect | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<GeoRect | null>(null);
  const [spacePan, setSpacePan] = useState(false);
  const [liveBox, setLiveBox] = useState<{ x: number; y: number } | null>(null);
  const panLast = useRef<{ x: number; y: number } | null>(null);
  const viewportRef = useRef(state.viewport);

  viewportRef.current = state.viewport;

  const { scale, offsetX, offsetY } = state.viewport;
  const imageW = screen.image.width;
  const imageH = screen.image.height;

  const fit = useMemo(
    () => fitImageInHost(width, height, imageW, imageH),
    [width, height, imageW, imageH],
  );

  const applyViewport = useCallback(
    (next: Viewport) => {
      const clamped = clampViewportPan(next, fit, width, height, imageW, imageH);
      const current = viewportRef.current;
      if (
        clamped.scale === current.scale &&
        clamped.offsetX === current.offsetX &&
        clamped.offsetY === current.offsetY
      ) {
        return;
      }
      viewportRef.current = clamped;
      dispatch({ type: "SET_VIEWPORT", viewport: clamped });
    },
    [dispatch, fit, width, height, imageW, imageH],
  );

  const displayScale = scale * fit.scale;
  const imageX = fit.x + offsetX;
  const imageY = fit.y + offsetY;
  const panning = state.tool === "pan" || spacePan;
  const drawing = ["anchor", "component"].includes(state.tool);
  const overlayInteract = !drawing && !panning && !canvasLocked;

  const activeAnchorId = state.activeAnchorId;

  useEffect(() => {
    if (canvasLocked) setSpacePan(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (canvasLocked) return;
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
  }, [canvasLocked]);

  useEffect(() => {
    if (drawing) return;
    setDrawStart(null);
    setDraftRect(null);
  }, [drawing]);

  const toImagePoint = (stageX: number, stageY: number) =>
    imagePointFromStage(stageX, stageY, imageX, imageY, displayScale);

  useEffect(() => {
    const onFit = () => {
      applyViewport({ scale: 1, offsetX: 0, offsetY: 0 });
    };
    window.addEventListener("rectra:fit", onFit);
    return () => window.removeEventListener("rectra:fit", onFit);
  }, [applyViewport]);

  useEffect(() => {
    applyViewport(viewportRef.current);
  }, [applyViewport]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewportRef.current;
      if (e.ctrlKey || e.metaKey) {
        const pointer = stage.getPointerPosition();
        const rect = container.getBoundingClientRect();
        const pivot = pointer ?? {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        const direction: -1 | 1 = e.deltaY > 0 ? -1 : 1;
        const next = zoomToward(v, fit, pivot, stepUserScale(v.scale, direction));
        if (next === v) return;
        applyViewport(next);
        return;
      }
      applyViewport({
        ...v,
        offsetX: v.offsetX - e.deltaX,
        offsetY: v.offsetY - e.deltaY,
      });
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [applyViewport, fit, width, height]);

  const selection = state.selection;
  const selectedPlacement =
    selection.kind === "placement" && selection.screenId === screen.id ? selection : null;

  useEffect(() => {
    const tr = transformerRef.current;
    const node = selectedNodeRef.current;
    if (!tr) return;
    const attach =
      state.showOverlays && state.tool === "select" && !canvasLocked && node ? [node] : [];
    tr.nodes(attach);
    tr.getLayer()?.batchDraw();
    setLiveBox(null);
  }, [selection, displayScale, imageX, imageY, state.showOverlays, state.tool, canvasLocked]);

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
    }
  };

  const syncLiveBox = (node: Konva.Rect) => {
    setLiveBox({ x: node.x(), y: node.y() });
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
    setLiveBox(null);
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

  const selectAnchor = (anchorId: string) => {
    dispatch({
      type: "SET_SELECTION",
      selection: { kind: "anchor", screenId: screen.id, anchorId },
    });
    dispatch({ type: "SET_ACTIVE_ANCHOR", screenId: screen.id, anchorId });
  };

  const selectPlacement = (anchorId: string, componentId: string) => {
    dispatch({
      type: "SET_SELECTION",
      selection: { kind: "placement", screenId: screen.id, anchorId, componentId },
    });
  };

  const overlayBoxes = state.showOverlays
    ? [
        ...screen.anchors.map((anchor) => {
          const selected =
            selection.kind === "anchor" &&
            selection.anchorId === anchor.id &&
            selection.screenId === screen.id;
          return {
            key: anchor.id,
            name: anchor.name,
            selected,
            stroke: overlayStroke("anchor", selected, anchor.id === activeAnchorId),
            x: imageX + anchor.rect.x * displayScale,
            y: imageY + anchor.rect.y * displayScale,
            width: anchor.rect.width * displayScale,
            height: anchor.rect.height * displayScale,
            onSelect: () => selectAnchor(anchor.id),
            onCommit: (node: Konva.Rect) =>
              commitTransform(node, "anchor", { anchorId: anchor.id }),
          };
        }),
        ...(activeAnchorId
          ? placementsToShow.map(({ component, placement }) => {
              const selected =
                selectedPlacement?.componentId === component.id &&
                selectedPlacement.anchorId === placement.anchorId;
              return {
                key: `${component.id}-${placement.anchorId}`,
                name: component.name,
                selected,
                stroke: overlayStroke("placement", selected),
                x: imageX + placement.rect.x * displayScale,
                y: imageY + placement.rect.y * displayScale,
                width: placement.rect.width * displayScale,
                height: placement.rect.height * displayScale,
                onSelect: () => selectPlacement(placement.anchorId, component.id),
                onCommit: (node: Konva.Rect) =>
                  commitTransform(node, "placement", {
                    anchorId: placement.anchorId,
                    componentId: component.id,
                  }),
              };
            })
          : []),
      ]
    : [];

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
          const v = viewportRef.current;
          applyViewport({
            ...v,
            offsetX: v.offsetX + dx,
            offsetY: v.offsetY + dy,
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
        {overlayBoxes.map((box) => (
          <Rect
            key={box.key}
            ref={box.selected ? selectedNodeRef : undefined}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            stroke={box.stroke.color}
            strokeWidth={box.stroke.width}
            dash={box.stroke.dash ?? []}
            fill="transparent"
            cornerRadius={overlayCornerRadius}
            strokeScaleEnabled={false}
            listening={overlayInteract}
            draggable={state.tool === "select" && box.selected && !canvasLocked}
            onClick={(ev) => {
              ev.cancelBubble = true;
              box.onSelect();
            }}
            onDragMove={(ev) => syncLiveBox(ev.target as Konva.Rect)}
            onTransform={(ev) => syncLiveBox(ev.target as Konva.Rect)}
            onDragEnd={(ev) => box.onCommit(ev.target as Konva.Rect)}
            onTransformEnd={(ev) => box.onCommit(ev.target as Konva.Rect)}
          />
        ))}
        {overlayBoxes.map((box) => (
          <OverlayLabel
            key={`label-${box.key}`}
            x={box.selected && liveBox ? liveBox.x : box.x}
            y={box.selected && liveBox ? liveBox.y : box.y}
            name={box.name}
            listening={overlayInteract}
            onClick={box.onSelect}
          />
        ))}
        {draftRect && (
          <Rect
            x={imageX + draftRect.x * displayScale}
            y={imageY + draftRect.y * displayScale}
            width={draftRect.width * displayScale}
            height={draftRect.height * displayScale}
            stroke={overlaySelected.color}
            strokeWidth={overlaySelected.width}
            dash={[4, 4]}
            listening={false}
          />
        )}
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          keepRatio={false}
          ignoreStroke
          borderEnabled={false}
          anchorFill={overlayHandle.fill}
          anchorSize={overlayHandle.size}
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          listening={state.tool === "select" && !canvasLocked}
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
