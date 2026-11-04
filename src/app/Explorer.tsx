import { useState } from "react";
import { useEditor } from "../editor/context";
import {
  confirmDeleteComponentEverywhere,
  handleDeleteSelection,
} from "./deleteActions";
import { placementCountForAnchor } from "../editor/reducer";
import {
  normalizeName,
  validateAnchorName,
  validateComponentName,
  validateScreenName,
} from "../model/names";
import { newId } from "../model/types";
import { decodeImageDimensions, pickImageFile } from "../persistence/project";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { useUi } from "./ui-context";

export function Explorer() {
  const { state, dispatch } = useEditor();
  const [screensOpen, setScreensOpen] = useState(true);
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(
    null,
  );

  const importScreen = async () => {
    const picked = await pickImageFile();
    if (!picked) return;
    const dims = await decodeImageDimensions(picked.bytes);
    const id = newId();
    dispatch({
      type: "ADD_SCREEN",
      screen: {
        id,
        name: picked.name || "Overview",
        image: { path: "", width: dims.width, height: dims.height },
        anchors: [],
        components: [],
      },
      imageBytes: picked.bytes,
      ext: picked.ext,
    });
  };

  return (
    <>
      <aside className="flex h-full flex-col bg-panel text-[12px]">
        <div className="px-[18px] pb-2 pt-6 text-[11px] font-semibold tracking-[0.06em] text-subtle">
          EXPLORER
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2">
          <button
            type="button"
            className="flex w-full items-center gap-1 px-2 py-1 text-left text-[13px] font-semibold text-text"
            onClick={() => setScreensOpen((v) => !v)}
          >
            <span className="w-3 text-muted">{screensOpen ? "▾" : "▸"}</span>
            {state.project.name}
          </button>
          {screensOpen && (
            <div className="mt-3">
              <div className="px-2 py-1 text-[11px] font-semibold tracking-[0.06em] text-subtle">
                SCREENS
              </div>
              {state.project.screens.length === 0 && (
                <div className="px-5 py-2 text-[12px] text-muted">No screens</div>
              )}
              {state.project.screens.map((s) => (
                <ScreenNode key={s.id} screenId={s.id} openMenu={setMenu} />
              ))}
            </div>
          )}
        </div>
        <div className="mt-auto border-t border-border px-5 py-4">
          <button
            type="button"
            className="text-[12px] text-muted hover:text-text"
            onClick={() => void importScreen()}
          >
            +  Add screen
          </button>
        </div>
      </aside>
      {menu && <ContextMenu {...menu} onClose={() => setMenu(null)} />}
    </>
  );
}

function ScreenNode({
  screenId,
  openMenu,
}: {
  screenId: string;
  openMenu: (m: { x: number; y: number; items: ContextMenuItem[] }) => void;
}) {
  const { state, dispatch } = useEditor();
  const { setDialog } = useUi();
  const screen = state.project.screens.find((s) => s.id === screenId)!;
  const [open, setOpen] = useState(true);
  const [anchorOpen, setAnchorOpen] = useState<Record<string, boolean>>({});
  const screenSelected =
    state.selection.kind === "screen" && state.selection.screenId === screenId;

  return (
    <div className="mb-0.5">
      <button
        type="button"
        className={`flex w-full items-center gap-1 rounded-[5px] px-2 py-2 text-left text-[13px] ${
          screenSelected ? "bg-selected font-semibold text-text" : "text-muted hover:bg-selected/40"
        }`}
        onClick={() => {
          dispatch({ type: "SET_ACTIVE_ANCHOR", screenId, anchorId: null });
          dispatch({ type: "SET_SELECTION", selection: { kind: "screen", screenId } });
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu({
            x: e.clientX,
            y: e.clientY,
            items: [
              {
                label: "Rename",
                onClick: () => {
                  const next = window.prompt("Screen name", screen.name);
                  if (!next) return;
                  const err = validateScreenName(state.project, screenId, next);
                  if (err) {
                    window.alert(err);
                    return;
                  }
                  dispatch({
                    type: "RENAME_SCREEN",
                    screenId,
                    name: normalizeName(next),
                  });
                },
              },
              {
                label: "Replace image",
                onClick: () => window.dispatchEvent(new CustomEvent("rectra:replace-image")),
              },
              {
                label: "Delete screen",
                danger: true,
                onClick: () =>
                  handleDeleteSelection(
                    { ...state, selection: { kind: "screen", screenId } },
                    dispatch,
                    setDialog,
                  ),
              },
            ],
          });
        }}
      >
        <span
          className="w-3"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          {open ? "▾" : "▸"}
        </span>
        {screen.name}
      </button>
      {open && (
        <div className="ml-2">
          {screen.anchors.map((anchor) => {
            const count = placementCountForAnchor(screen, anchor.id);
            const expanded = anchorOpen[anchor.id] ?? true;
            const anchorSelected =
              state.selection.kind === "anchor" && state.selection.anchorId === anchor.id;
            return (
              <div key={anchor.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-[5px] px-2 py-1.5 ${
                    anchorSelected ? "bg-selected text-text" : "text-muted hover:bg-selected/40"
                  }`}
                  onClick={() => {
                    dispatch({ type: "SET_ACTIVE_ANCHOR", screenId, anchorId: anchor.id });
                    dispatch({
                      type: "SET_SELECTION",
                      selection: { kind: "anchor", screenId, anchorId: anchor.id },
                    });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openMenu({
                      x: e.clientX,
                      y: e.clientY,
                      items: [
                        {
                          label: "Rename",
                          onClick: () => {
                            const next = window.prompt("Anchor name", anchor.name);
                            if (!next) return;
                            const err = validateAnchorName(screen, anchor.id, next);
                            if (err) {
                              window.alert(err);
                              return;
                            }
                            dispatch({
                              type: "RENAME_ANCHOR",
                              screenId,
                              anchorId: anchor.id,
                              name: normalizeName(next),
                            });
                          },
                        },
                        {
                          label: "Map component",
                          onClick: () =>
                            setDialog({ kind: "mapComponent", screenId, anchorId: anchor.id }),
                        },
                        {
                          label: "Delete anchor",
                          danger: true,
                          onClick: () =>
                            handleDeleteSelection(
                              {
                                ...state,
                                selection: { kind: "anchor", screenId, anchorId: anchor.id },
                              },
                              dispatch,
                              setDialog,
                            ),
                        },
                      ],
                    });
                  }}
                >
                  <span className="flex items-center gap-1">
                    <span
                      className="w-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnchorOpen((m) => ({ ...m, [anchor.id]: !expanded }));
                      }}
                    >
                      {expanded ? "▾" : "▸"}
                    </span>
                    {anchor.name}
                  </span>
                </button>
                {!expanded && count > 0 && (
                  <div className="px-8 pb-1 text-[11px] text-subtle">{count} mappings</div>
                )}
                {expanded &&
                  screen.components
                    .filter((c) => c.placements.some((p) => p.anchorId === anchor.id))
                    .map((c) => {
                      const selected =
                        state.selection.kind === "placement" &&
                        state.selection.componentId === c.id &&
                        state.selection.anchorId === anchor.id;
                      return (
                        <button
                          key={`${c.id}-${anchor.id}`}
                          type="button"
                          className={`ml-3 flex w-[calc(100%-12px)] items-center rounded-[5px] px-2 py-1.5 text-left ${
                            selected ? "bg-row text-text" : "text-muted hover:bg-selected/40"
                          }`}
                          onClick={() => {
                            dispatch({ type: "SET_ACTIVE_ANCHOR", screenId, anchorId: anchor.id });
                            dispatch({
                              type: "SET_SELECTION",
                              selection: {
                                kind: "placement",
                                screenId,
                                anchorId: anchor.id,
                                componentId: c.id,
                              },
                            });
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            openMenu({
                              x: e.clientX,
                              y: e.clientY,
                              items: [
                                {
                                  label: "Rename",
                                  onClick: () => {
                                    const next = window.prompt("Component name", c.name);
                                    if (!next) return;
                                    const err = validateComponentName(screen, c.id, next);
                                    if (err) {
                                      window.alert(err);
                                      return;
                                    }
                                    dispatch({
                                      type: "RENAME_COMPONENT",
                                      screenId,
                                      componentId: c.id,
                                      name: normalizeName(next),
                                    });
                                  },
                                },
                                {
                                  label: "Remove mapping",
                                  onClick: () =>
                                    dispatch({
                                      type: "REMOVE_PLACEMENT",
                                      screenId,
                                      componentId: c.id,
                                      anchorId: anchor.id,
                                    }),
                                },
                                {
                                  label: "Delete everywhere",
                                  danger: true,
                                  onClick: () =>
                                    confirmDeleteComponentEverywhere(
                                      state,
                                      screenId,
                                      c.id,
                                      setDialog,
                                      dispatch,
                                    ),
                                },
                              ],
                            });
                          }}
                        >
                          <span className="mr-1.5 text-[10px]">▫</span>
                          {c.name}
                        </button>
                      );
                    })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
