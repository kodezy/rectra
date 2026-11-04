import { offsetValues } from "./geometry";
import type { Project, Screen } from "./types";

export type ExportMappings = {
  formatVersion: 1;
  projectId: string;
  projectName: string;
  screens: Array<{
    id: string;
    name: string;
    imageSize: { width: number; height: number };
    anchors: Array<{
      id: string;
      name: string;
      template: string;
      components: Array<{
        id: string;
        name: string;
        type: "coord" | "bbox";
        offset: number[] | number[][];
      }>;
    }>;
  }>;
};

export function buildExportMappings(project: Project): ExportMappings {
  return {
    formatVersion: 1,
    projectId: project.id,
    projectName: project.name,
    screens: project.screens.map(exportScreen),
  };
}

function exportScreen(screen: Screen) {
  return {
    id: screen.id,
    name: screen.name,
    imageSize: { width: screen.image.width, height: screen.image.height },
    anchors: screen.anchors.map((anchor) => {
      const components = screen.components
        .map((component) => {
          const placement = component.placements.find((p) => p.anchorId === anchor.id);
          if (!placement) return null;
          const offset = offsetValues(component.type, placement.rect, anchor.rect);
          return {
            id: component.id,
            name: component.name,
            type: component.type,
            offset,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
      return {
        id: anchor.id,
        name: anchor.name,
        template: `templates/${anchor.id}.png`,
        components,
      };
    }),
  };
}

export function projectHasAnchor(project: Project): boolean {
  return project.screens.some((s) => s.anchors.length > 0);
}
