import type { Project } from "./types";

/** Spec example 1280×720 with anchors A/B and search_field + submit_button */
export function specExampleProject(): Project {
  const anchorA = "anchor-001";
  const anchorB = "anchor-002";
  const compSearch = "component-001";
  const compSubmit = "component-002";
  return {
    formatVersion: 1,
    id: "project-001",
    name: "Sample Workspace",
    screens: [
      {
        id: "screen-001",
        name: "Overview",
        image: { path: "assets/screens/screen-001--asset-001.png", width: 1280, height: 720 },
        anchors: [
          { id: anchorA, name: "anchor_primary", rect: { x: 200, y: 100, width: 90, height: 30 } },
          { id: anchorB, name: "anchor_secondary", rect: { x: 420, y: 200, width: 90, height: 30 } },
        ],
        components: [
          {
            id: compSearch,
            name: "search_field",
            type: "bbox",
            placements: [
              { anchorId: anchorA, rect: { x: 350, y: 155, width: 220, height: 40 } },
              { anchorId: anchorB, rect: { x: 570, y: 245, width: 220, height: 40 } },
            ],
          },
          {
            id: compSubmit,
            name: "submit_button",
            type: "coord",
            placements: [
              { anchorId: anchorA, rect: { x: 600, y: 400, width: 100, height: 40 } },
              { anchorId: anchorB, rect: { x: 670, y: 410, width: 100, height: 40 } },
            ],
          },
        ],
      },
    ],
  };
}
