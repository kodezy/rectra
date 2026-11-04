import { useEffect, useState } from "react";
import { useEditor } from "../editor/context";
import { unmappedComponentsForAnchor } from "../editor/reducer";
import { exportMappingsPackage } from "../persistence/exportPackage";
import { pickExportDir } from "../persistence/project";
import { Button } from "./components/Button";
import { useUi } from "./ui-context";

export function DialogLayer() {
  const { dialog, setDialog } = useUi();

  if (dialog.kind === "none") return null;
  if (dialog.kind === "export") {
    return <ExportDialog onClose={() => setDialog({ kind: "none" })} />;
  }
  if (dialog.kind === "mapComponent") {
    return (
      <MapComponentDialog
        screenId={dialog.screenId}
        anchorId={dialog.anchorId}
        onClose={() => setDialog({ kind: "none" })}
      />
    );
  }
  if (dialog.kind === "unsaved") {
    return (
      <Modal title="Unsaved changes" width={440} onClose={() => dialog.onResolve("cancel")}>
        <p className="text-[13px] text-muted">Save changes before closing?</p>
        <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
          <Button onClick={() => dialog.onResolve("cancel")}>Cancel</Button>
          <Button onClick={() => dialog.onResolve("discard")}>Discard</Button>
          <Button variant="primary" onClick={() => dialog.onResolve("save")}>
            Save
          </Button>
        </div>
      </Modal>
    );
  }
  if (dialog.kind === "confirmDelete" || dialog.kind === "confirmReplace") {
    const confirmLabel = dialog.kind === "confirmReplace" ? "Replace" : "Delete";
    const variant = dialog.kind === "confirmReplace" ? "primary" : "destructive";
    return (
      <Modal title={dialog.title} width={440} onClose={() => setDialog({ kind: "none" })}>
        <p className="whitespace-pre-line text-[13px] text-muted">{dialog.message}</p>
        <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
          <Button onClick={() => setDialog({ kind: "none" })}>Cancel</Button>
          <Button
            variant={variant}
            onClick={() => {
              dialog.onConfirm();
              setDialog({ kind: "none" });
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    );
  }
  return null;
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const { state } = useEditor();
  const [dest, setDest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [replaceAsk, setReplaceAsk] = useState(false);

  const runExport = async (replaceConfirmed: boolean) => {
    if (!dest.trim()) {
      setError("Choose an output folder.");
      return;
    }
    try {
      await exportMappingsPackage(state, dest.trim(), replaceConfirmed);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "NEEDS_REPLACE_CONFIRM") {
        setReplaceAsk(true);
        return;
      }
      setError(msg);
    }
  };

  if (replaceAsk) {
    return (
      <Modal title="Replace export" width={440} onClose={() => setReplaceAsk(false)}>
        <p className="text-[13px] text-muted">Replace the existing export package in this folder?</p>
        <div className="mt-8 flex justify-end gap-2 border-t border-border pt-5">
          <Button onClick={() => setReplaceAsk(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => void runExport(true)}>
            Replace
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Export" width={532} onClose={onClose}>
      <p className="text-[11px] font-semibold tracking-[0.06em] text-subtle">DESTINATION</p>
      <div className="mt-2 flex gap-2">
        <input
          className="h-[39px] min-w-0 flex-1 rounded-[5px] bg-input px-3 text-[12px] focus-visible:ring-1 focus-visible:ring-text"
          placeholder="Folder path"
          value={dest}
          onChange={(e) => {
            setDest(e.target.value);
            setError(null);
          }}
        />
        <Button
          className="h-[39px]"
          onClick={async () => {
            const dir = await pickExportDir();
            if (dir) setDest(dir);
          }}
        >
          Browse
        </Button>
      </div>
      {error && <p className="mt-2 text-destructive">{error}</p>}
      <div className="mt-5 h-px bg-border" />
      <p className="mt-5 text-[11px] font-semibold tracking-[0.06em] text-subtle">FILES</p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-[13px] font-medium">mappings.json</p>
          <p className="text-[12px] text-muted">Anchors and offsets</p>
        </div>
        <div>
          <p className="text-[13px] font-medium">templates/</p>
          <p className="text-[12px] text-muted">PNG per anchor</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
        <Button className="min-w-[105px]" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" className="min-w-[105px]" onClick={() => void runExport(false)}>
          Export
        </Button>
      </div>
    </Modal>
  );
}

function MapComponentDialog({
  screenId,
  anchorId,
  onClose,
}: {
  screenId: string;
  anchorId: string;
  onClose: () => void;
}) {
  const { state, dispatch } = useEditor();
  const screen = state.project.screens.find((s) => s.id === screenId)!;
  const anchor = screen.anchors.find((a) => a.id === anchorId);
  const options = unmappedComponentsForAnchor(screen, anchorId);
  const [selected, setSelected] = useState(options[0]?.id ?? "");
  const chosen = options.find((c) => c.id === selected);

  return (
    <Modal title="Map component" width={505} onClose={onClose}>
      <p className="text-[13px] text-muted">
        Choose a component for {anchor?.name ?? "this anchor"}.
      </p>
      <p className="mt-6 text-[11px] font-semibold tracking-[0.06em] text-subtle">AVAILABLE</p>
      {options.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">All components are mapped to this anchor</p>
      ) : (
        <div className="mt-2 max-h-40 space-y-1 overflow-auto">
          {options.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`flex w-full items-center gap-3 rounded-[5px] px-3 py-2.5 text-left ${
                selected === c.id ? "bg-selected" : "hover:bg-selected/40"
              }`}
              onClick={() => setSelected(c.id)}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-border text-[10px]">
                {selected === c.id ? "■" : ""}
              </span>
              <span>
                <span className="block text-[13px] font-medium">{c.name}</span>
                <span className="text-[12px] text-muted">
                  {c.type === "bbox" ? "BBox" : "Coord"}  ·  available
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="mt-4 text-[13px] text-muted">Then draw its region on the image.</p>
      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
        <Button className="min-w-[105px]" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="min-w-[105px]"
          disabled={!chosen}
          onClick={() => {
            dispatch({
              type: "START_MAP_PLACEMENT",
              pending: { screenId, anchorId, componentId: selected },
            });
            onClose();
          }}
        >
          Continue
        </Button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose,
  width = 448,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0b0d]/75 p-4">
      <div
        role="dialog"
        className="rounded-[9px] border border-border bg-panel p-7"
        style={{ width }}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-[21px] font-semibold">{title}</h2>
          <button
            type="button"
            className="text-[22px] leading-none text-muted hover:text-text"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
