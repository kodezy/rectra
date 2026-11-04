import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEditor } from "../editor/context";
import { TOOLRAIL_HEIGHT, TOOLRAIL_OFFSET_Y, toolrailWidth } from "./layout";
import { useUi } from "./ui-context";

export function Toolrail() {
  const { state, dispatch } = useEditor();
  const { compact } = useUi();
  const componentDisabled = !state.activeAnchorId;
  const componentActive = state.tool === "component";
  const slot = compact ? 34 : 38;
  const width = toolrailWidth(compact);

  return (
    <div
      className="pointer-events-none absolute left-2 z-10 flex flex-col items-center rounded-[8px] border border-border bg-surface py-1.5"
      style={{ width, height: TOOLRAIL_HEIGHT, top: TOOLRAIL_OFFSET_Y }}
      role="toolbar"
      aria-label="Canvas tools"
    >
      <div className="pointer-events-auto flex h-full flex-col items-center justify-between py-0.5">
        <RailButton
          size={slot}
          active={state.tool === "select"}
          title="Select (V)"
          onClick={() => dispatch({ type: "SET_TOOL", tool: "select" })}
        >
          <SelectIcon />
        </RailButton>
        <RailButton
          size={slot}
          active={state.tool === "anchor"}
          title="Anchor (A)"
          onClick={() => dispatch({ type: "SET_TOOL", tool: "anchor" })}
        >
          <AnchorIcon />
        </RailButton>
        <RailButton
          size={slot}
          active={componentActive}
          disabled={componentDisabled}
          title={componentDisabled ? "Select an anchor first" : "Component (C)"}
          onClick={() => dispatch({ type: "SET_TOOL", tool: "component" })}
        >
          <ComponentIcon />
        </RailButton>
        <RailButton
          size={slot}
          active={state.tool === "pan"}
          title="Pan (Space)"
          onClick={() => dispatch({ type: "SET_TOOL", tool: "pan" })}
        >
          <PanIcon />
        </RailButton>
      </div>
    </div>
  );
}

function RailButton({
  active,
  size,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; size: number }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-[6px] focus-visible:ring-1 focus-visible:ring-text ${
        active ? "bg-selected text-primary" : "text-[#b3bac4] hover:text-text"
      } disabled:opacity-40`}
      style={{ width: size, height: size }}
      {...props}
    >
      {children}
    </button>
  );
}

function SelectIcon() {
  return (
    <Icon>
      <path d="M4.17 2.5L15.83 10L10 11.25L7.75 16.67L4.17 2.5" />
    </Icon>
  );
}

function AnchorIcon() {
  return (
    <Icon>
      <path d="M6.67 3.33H3.33V6.67M13.33 3.33H16.67V6.67M16.67 13.33V16.67H13.33M6.67 16.67H3.33V13.33" />
      <rect x="6.67" y="6.67" width="3.33" height="3.33" rx="0.6" fill="currentColor" stroke="none" />
    </Icon>
  );
}

function ComponentIcon() {
  return (
    <Icon>
      <rect x="4.17" y="4.17" width="11.67" height="11.67" rx="1" />
      <path d="M4.17 8.33H15.83M8.33 4.17V15.83" />
    </Icon>
  );
}

function PanIcon() {
  return (
    <Icon>
      <path d="M5.83 10V5a1.25 1.25 0 0 1 2.5 0v3.33V3.33a1.25 1.25 0 0 1 2.5 0v5V5a1.25 1.25 0 0 1 2.5 0v5V8.33a1.25 1.25 0 0 1 2.5 0V12.5A4.17 4.17 0 0 1 10.83 17.5H9.17c-1.67 0-2.92-.83-4.17-2.5L3.33 12.5a1.25 1.25 0 0 1 2.08-1.25L5.83 12.5" />
    </Icon>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <g
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}
