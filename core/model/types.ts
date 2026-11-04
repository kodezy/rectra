export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ComponentType = "coord" | "bbox";

export type Placement = {
  anchorId: string;
  rect: Rect;
};

export type Component = {
  id: string;
  name: string;
  type: ComponentType;
  placements: Placement[];
};

export type Anchor = {
  id: string;
  name: string;
  rect: Rect;
};

export type ScreenImage = {
  path: string;
  width: number;
  height: number;
};

export type Screen = {
  id: string;
  name: string;
  image: ScreenImage;
  anchors: Anchor[];
  components: Component[];
};

export type Project = {
  formatVersion: 1;
  id: string;
  name: string;
  screens: Screen[];
};

export type ScreenImageMem = {
  bytes: Uint8Array;
  ext: string;
  /** When true, next Save writes a new asset file. */
  pendingWrite: boolean;
};

export type ImageBounds = Pick<ScreenImage, "width" | "height">;

export type Selection =
  | { kind: "none" }
  | { kind: "screen"; screenId: string }
  | { kind: "anchor"; screenId: string; anchorId: string }
  | {
      kind: "placement";
      screenId: string;
      anchorId: string;
      componentId: string;
    };

export function newId(): string {
  return crypto.randomUUID();
}

export function emptyProject(name = "Untitled project"): Project {
  return {
    formatVersion: 1,
    id: newId(),
    name,
    screens: [],
  };
}
