import { useEffect, useState } from "react";
import { useEditor } from "../editor/context";
import { projectHasAnchor } from "../model";
import { normalizeName } from "../model/names";
import { Button } from "./components/Button";
import { HEADER_HEIGHT } from "./layout";
import { Logo } from "./Logo";
import { useUnsavedGuard } from "./useUnsavedGuard";
import { useUi } from "./ui-context";

export function Header() {
  const { state, dispatch } = useEditor();
  const { setDialog } = useUi();
  const guardUnsaved = useUnsavedGuard();
  const screen = state.project.screens.find((s) => s.id === state.activeScreenId);
  const canExport = projectHasAnchor(state.project);
  const [projectName, setProjectName] = useState(state.project.name);

  useEffect(() => {
    setProjectName(state.project.name);
  }, [state.project.name]);

  const crumb = screen
    ? `${state.project.name}  /  ${screen.name}`
    : state.project.name;

  return (
    <header
      className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-5"
      style={{ height: HEADER_HEIGHT }}
    >
      <div className="flex min-w-0 items-center">
        <Logo />
        <span className="ml-2.5 text-[16px] font-bold leading-none text-primary">Rectra</span>
        <span className="mx-5 h-6 w-px bg-border" />
        <div className="flex min-w-0 items-center text-[13px] text-muted">
          <input
            data-project-name="1"
            className="min-w-0 max-w-[180px] truncate bg-transparent text-[13px] text-muted"
            value={projectName}
            title={crumb}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => {
              const name = normalizeName(projectName);
              if (name && name !== state.project.name) {
                dispatch({ type: "RENAME_PROJECT", name });
              } else {
                setProjectName(state.project.name);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          {screen && (
            <span className="truncate">
              {"  /  "}
              {screen.name}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          className="min-w-[76px]"
          onClick={() =>
            guardUnsaved(() => {
              dispatch({ type: "NEW_PROJECT" });
            })
          }
        >
          New
        </Button>
        <Button
          className="min-w-[76px]"
          onClick={() => window.dispatchEvent(new CustomEvent("rectra:open"))}
        >
          Open
        </Button>
        <Button
          className="min-w-[76px]"
          onClick={() => window.dispatchEvent(new CustomEvent("rectra:save"))}
        >
          Save
        </Button>
        <Button
          variant="primary"
          className="min-w-[102px]"
          disabled={!canExport}
          onClick={() => setDialog({ kind: "export" })}
        >
          Export
        </Button>
      </div>
    </header>
  );
}
