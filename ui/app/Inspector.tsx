import { useEffect, useState, type ReactNode } from "react";
import { useEditor } from "../editor/context";
import {
  formatOffset,
  isRectValid,
  offsetValues,
  type Rect,
} from "../model/geometry";
import {
  normalizeName,
  validateAnchorName,
  validateComponentName,
  validateScreenName,
} from "../model/names";
import type { ComponentType } from "../model/types";
import { Button } from "./components/Button";
import { handleDeleteSelection } from "./deleteActions";
import { useActiveScreen, useUi } from "./ui-context";

const fieldClass =
  "mt-1 h-[35px] w-full rounded-[4px] border-0 bg-input px-2.5 text-[12px] text-text";

export function Inspector() {
  const { state } = useEditor();
  const screen = useActiveScreen();
  const sel = state.selection;

  if (!screen || sel.kind === "none") {
    return (
      <InspectorShell>
        <p className="mt-8 text-[18px] font-semibold text-text">Nothing selected</p>
        <p className="mt-2 text-[12px] text-muted">Select an anchor or component.</p>
      </InspectorShell>
    );
  }

  if (sel.kind === "screen" && sel.screenId === screen.id) {
    return <InspectorScreen screen={screen} />;
  }
  if (sel.kind === "anchor" && sel.screenId === screen.id) {
    const anchor = screen.anchors.find((a) => a.id === sel.anchorId);
    if (anchor) return <InspectorAnchor screen={screen} anchorId={anchor.id} />;
  }
  if (sel.kind === "placement" && sel.screenId === screen.id) {
    return <InspectorPlacement screen={screen} selection={sel} />;
  }

  return (
    <InspectorShell>
      <p className="mt-8 text-[18px] font-semibold text-text">Nothing selected</p>
      <p className="mt-2 text-[12px] text-muted">Select an anchor or component.</p>
    </InspectorShell>
  );
}

function InspectorShell({ children }: { children: ReactNode }) {
  return (
    <aside className="flex h-full flex-col overflow-auto border-l border-border bg-panel px-5 pb-6 pt-6 text-[12px]">
      <div className="text-[11px] font-semibold tracking-[0.06em] text-subtle">INSPECTOR</div>
      {children}
    </aside>
  );
}

function InspectorScreen({ screen }: { screen: NonNullable<ReturnType<typeof useActiveScreen>> }) {
  const { state, dispatch } = useEditor();
  const { setDialog } = useUi();
  const [name, setName] = useState(screen.name);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setName(screen.name), [screen.name]);

  return (
    <InspectorShell>
      <p className="mt-4 text-[18px] font-semibold">{screen.name}</p>
      <div className="mt-4 h-px bg-border" />
      <label className="mt-5 block text-[12px] text-muted">Name</label>
      <input
        className={`${fieldClass} ${error ? "ring-1 ring-destructive" : ""}`}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onBlur={() => {
          const err = validateScreenName(state.project, screen.id, name);
          if (err) {
            setError(err);
            setName(screen.name);
            return;
          }
          dispatch({ type: "RENAME_SCREEN", screenId: screen.id, name: normalizeName(name) });
        }}
      />
      {error && <p className="mt-1 text-destructive">{error}</p>}
      <p className="mt-5 text-[11px] font-semibold tracking-[0.06em] text-subtle">IMAGE</p>
      <p className="mt-2 text-[13px] text-text">
        {screen.image.width} × {screen.image.height}
      </p>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => window.dispatchEvent(new CustomEvent("rectra:replace-image"))}>
          Replace
        </Button>
        <Button
          variant="destructive"
          onClick={() =>
            handleDeleteSelection(
              { ...state, selection: { kind: "screen", screenId: screen.id } },
              dispatch,
              setDialog,
            )
          }
        >
          Delete
        </Button>
      </div>
    </InspectorShell>
  );
}

function InspectorAnchor({
  screen,
  anchorId,
}: {
  screen: NonNullable<ReturnType<typeof useActiveScreen>>;
  anchorId: string;
}) {
  const { dispatch } = useEditor();
  const { setDialog } = useUi();
  const anchor = screen.anchors.find((a) => a.id === anchorId)!;
  const mapped = screen.components.filter((c) =>
    c.placements.some((p) => p.anchorId === anchorId),
  );
  const [name, setName] = useState(anchor.name);
  const [nameError, setNameError] = useState<string | null>(null);
  useEffect(() => setName(anchor.name), [anchor.name]);

  return (
    <InspectorShell>
      <p className="mt-4 text-[18px] font-semibold">{anchor.name}</p>
      <p className="mt-1 text-[11px] text-muted">
        {mapped.length} component{mapped.length === 1 ? "" : "s"}
      </p>
      <div className="mt-4 h-px bg-border" />
      <label className="mt-5 text-[12px] text-muted">Name</label>
      <input
        className={`${fieldClass} ${nameError ? "ring-1 ring-destructive" : ""}`}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setNameError(null);
        }}
        onBlur={() => {
          const err = validateAnchorName(screen, anchorId, name);
          if (err) {
            setNameError(err);
            setName(anchor.name);
            return;
          }
          dispatch({
            type: "RENAME_ANCHOR",
            screenId: screen.id,
            anchorId,
            name: normalizeName(name),
          });
        }}
      />
      {nameError && <p className="mt-1 text-destructive">{nameError}</p>}
      <p className="mt-5 text-[11px] font-semibold tracking-[0.06em] text-subtle">
        GEOMETRY  ·  PX
      </p>
      <RectFields
        rect={anchor.rect}
        bounds={screen.image}
        onCommit={(rect) =>
          dispatch({ type: "UPDATE_ANCHOR_RECT", screenId: screen.id, anchorId, rect })
        }
      />
      <div className="mt-5 h-px bg-border" />
      <p className="mt-5 text-[11px] font-semibold tracking-[0.06em] text-subtle">COMPONENTS</p>
      <div className="mt-2 space-y-1">
        {mapped.map((c) => (
          <p key={c.id} className="text-[13px] font-medium text-text">
            {c.name}
          </p>
        ))}
      </div>
      <Button
        variant="primary"
        className="mt-6 w-full"
        onClick={() => setDialog({ kind: "mapComponent", screenId: screen.id, anchorId })}
      >
        Map component
      </Button>
    </InspectorShell>
  );
}

function InspectorPlacement({
  screen,
  selection,
}: {
  screen: NonNullable<ReturnType<typeof useActiveScreen>>;
  selection: { componentId: string; anchorId: string };
}) {
  const { dispatch } = useEditor();
  const component = screen.components.find((c) => c.id === selection.componentId)!;
  const anchor = screen.anchors.find((a) => a.id === selection.anchorId)!;
  const placement = component.placements.find((p) => p.anchorId === selection.anchorId)!;
  const anchorCount = component.placements.length;
  const [name, setName] = useState(component.name);
  const [nameError, setNameError] = useState<string | null>(null);
  useEffect(() => setName(component.name), [component.name]);

  return (
    <InspectorShell>
      <p className="mt-4 text-[18px] font-semibold">{component.name}</p>
      <p className="mt-1 text-[11px] text-muted">
        {anchorCount} anchor{anchorCount === 1 ? "" : "s"}
      </p>
      <div className="mt-4 h-px bg-border" />
      <label className="mt-5 text-[12px] text-muted">Name</label>
      <input
        className={`${fieldClass} ${nameError ? "ring-1 ring-destructive" : ""}`}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setNameError(null);
        }}
        onBlur={() => {
          const err = validateComponentName(screen, component.id, name);
          if (err) {
            setNameError(err);
            setName(component.name);
            return;
          }
          dispatch({
            type: "RENAME_COMPONENT",
            screenId: screen.id,
            componentId: component.id,
            name: normalizeName(name),
          });
        }}
      />
      {nameError && <p className="mt-1 text-destructive">{nameError}</p>}
      <p className="mt-5 text-[12px] text-muted">Type</p>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        {(["bbox", "coord"] as ComponentType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`h-[34px] rounded-[4px] text-[12px] ${
              component.type === t
                ? "bg-selected font-semibold text-text"
                : "bg-input font-normal text-muted"
            }`}
            onClick={() =>
              dispatch({
                type: "SET_COMPONENT_TYPE",
                screenId: screen.id,
                componentId: component.id,
                componentType: t,
              })
            }
          >
            {t === "bbox" ? "BBox" : "Coord"}
          </button>
        ))}
      </div>
      <p className="mt-6 text-[11px] font-semibold tracking-[0.06em] text-subtle">MAPPING</p>
      <p className="mt-3 text-[12px] text-muted">Anchor</p>
      <div className="relative mt-1">
        <div className="flex h-[33px] items-center justify-between rounded-[4px] bg-input px-2.5 text-[12px]">
          <span>{anchor.name}</span>
          <span className="text-muted">⌄</span>
        </div>
      </div>
      <p className="mt-5 text-[11px] font-semibold tracking-[0.06em] text-subtle">
        POSITION  ·  PX
      </p>
      <RectFields
        rect={placement.rect}
        bounds={screen.image}
        onCommit={(rect) =>
          dispatch({
            type: "UPDATE_PLACEMENT_RECT",
            screenId: screen.id,
            componentId: component.id,
            anchorId: selection.anchorId,
            rect,
          })
        }
      />
      <div className="mt-5 h-px bg-border" />
      <p className="mt-5 text-[11px] font-semibold tracking-[0.06em] text-subtle">OFFSET  ·  PX</p>
      <p className="mt-3 text-[13px] font-medium text-text">
        {formatOffset(component.type, placement.rect, anchor.rect)}
      </p>
      <Button
        className="mt-4 w-full"
        onClick={() =>
          void navigator.clipboard.writeText(
            JSON.stringify(offsetValues(component.type, placement.rect, anchor.rect)),
          )
        }
      >
        Copy
      </Button>
    </InspectorShell>
  );
}

function RectFields({
  rect,
  bounds,
  onCommit,
}: {
  rect: Rect;
  bounds: { width: number; height: number };
  onCommit: (rect: Rect) => void;
}) {
  const [draft, setDraft] = useState({
    x: String(rect.x),
    y: String(rect.y),
    width: String(rect.width),
    height: String(rect.height),
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft({
      x: String(rect.x),
      y: String(rect.y),
      width: String(rect.width),
      height: String(rect.height),
    });
    setError(null);
  }, [rect.x, rect.y, rect.width, rect.height]);

  const commit = () => {
    const next = {
      x: Number(draft.x),
      y: Number(draft.y),
      width: Number(draft.width),
      height: Number(draft.height),
    };
    if (Object.values(draft).some((v) => v.trim() === "" || Number.isNaN(Number(v)))) {
      setError("Enter a value within image bounds.");
      return;
    }
    if (!isRectValid(next, bounds)) {
      setError("Enter a value within image bounds.");
      return;
    }
    setError(null);
    onCommit(next);
  };

  const cells: Array<{ key: keyof typeof draft; label: string }> = [
    { key: "x", label: "X" },
    { key: "y", label: "Y" },
    { key: "width", label: "W" },
    { key: "height", label: "H" },
  ];

  return (
    <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-2">
      {cells.map(({ key, label }) => (
        <div key={key}>
          <label className="text-[11px] text-muted">{label}</label>
          <input
            className={`mt-1 h-[34px] w-full rounded-[4px] bg-input px-2.5 text-[12px] ${
              error ? "ring-1 ring-destructive" : ""
            }`}
            value={draft[key]}
            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft({
                  x: String(rect.x),
                  y: String(rect.y),
                  width: String(rect.width),
                  height: String(rect.height),
                });
                setError(null);
              }
            }}
            onBlur={commit}
          />
        </div>
      ))}
      {error && <p className="col-span-2 text-destructive">{error}</p>}
    </div>
  );
}
