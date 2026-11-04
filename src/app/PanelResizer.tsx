import { useEffect, useRef } from "react";

type Props = {
  onResize: (delta: number) => void;
  onReset?: () => void;
};

export function PanelResizer({ onResize, onReset }: Props) {
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      onResize(e.movementX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onResize]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="w-px shrink-0 cursor-col-resize bg-border hover:bg-muted"
      onMouseDown={() => {
        dragging.current = true;
      }}
      onDoubleClick={() => onReset?.()}
    />
  );
}
