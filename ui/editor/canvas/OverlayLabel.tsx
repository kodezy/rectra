import { useEffect, useRef, useState } from "react";
import { Rect, Text } from "react-konva";
import type Konva from "konva";
import { overlayLabel } from "./overlayStyle";

type Props = {
  x: number;
  y: number;
  name: string;
  listening: boolean;
  onClick: () => void;
};

export function OverlayLabel({ x, y, name, listening, onClick }: Props) {
  const textRef = useRef<Konva.Text>(null);
  const [textWidth, setTextWidth] = useState(() => Math.ceil(name.length * 6.2));

  useEffect(() => {
    const measured = textRef.current?.getTextWidth();
    if (measured && measured !== textWidth) setTextWidth(measured);
  }, [name, textWidth]);

  const width = textWidth + overlayLabel.paddingX * 2;
  const top = y - overlayLabel.height - overlayLabel.gap;

  return (
    <>
      <Rect
        x={x}
        y={top}
        width={width}
        height={overlayLabel.height}
        fill={overlayLabel.fill}
        stroke={overlayLabel.stroke}
        strokeWidth={overlayLabel.strokeWidth}
        cornerRadius={overlayLabel.radius}
        listening={listening}
        onClick={(ev) => {
          ev.cancelBubble = true;
          onClick();
        }}
      />
      <Text
        ref={textRef}
        x={x + overlayLabel.paddingX}
        y={top + overlayLabel.paddingY}
        text={name}
        fontSize={overlayLabel.fontSize}
        fontFamily={overlayLabel.fontFamily}
        fontStyle={overlayLabel.fontStyle}
        fill={overlayLabel.text}
        lineHeight={overlayLabel.lineHeight}
        listening={false}
      />
    </>
  );
}
