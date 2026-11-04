import { describe, expect, it } from "vitest";
import { specExampleProject } from "@core/model/fixture";
import {
  isDuplicateName,
  isNameEmpty,
  nextSequentialName,
  normalizeName,
  projectSlug,
  validateAnchorName,
  validateComponentName,
  validateScreenName,
} from "@core/model/names";

describe("names", () => {
  it("trims and rejects empty names", () => {
    expect(normalizeName("  Overview  ")).toBe("Overview");
    expect(isNameEmpty("   ")).toBe(true);
    expect(isNameEmpty("x")).toBe(false);
  });

  it("detects duplicates case-insensitively except the current name", () => {
    expect(isDuplicateName(["Overview", "Detail"], "overview")).toBe(true);
    expect(isDuplicateName(["Overview"], "Overview", "Overview")).toBe(false);
  });

  it("slugs project names and falls back to project", () => {
    expect(projectSlug("Sample Workspace")).toBe("sample-workspace");
    expect(projectSlug("Área 1!")).toBe("area-1");
    expect(projectSlug("***")).toBe("project");
  });

  it("increments the highest sequential suffix", () => {
    expect(nextSequentialName("anchor", [])).toBe("anchor_1");
    expect(nextSequentialName("anchor", ["anchor_primary", "anchor_2"])).toBe("anchor_3");
  });

  it("validates screen, anchor, and component names on the spec project", () => {
    const project = specExampleProject();
    const screen = project.screens[0]!;
    expect(validateScreenName(project, "screen-001", "  ")).toBe("Name is required");
    expect(validateScreenName(project, "other", "Overview")).toBe("Name already in use");
    expect(validateScreenName(project, "screen-001", "Overview")).toBeNull();
    expect(validateAnchorName(screen, "anchor-001", "anchor_secondary")).toBe("Name already in use");
    expect(validateAnchorName(screen, "anchor-001", "anchor_primary")).toBeNull();
    expect(validateComponentName(screen, "component-001", "submit_button")).toBe(
      "Name already in use",
    );
    expect(validateComponentName(screen, "component-001", "search_field")).toBeNull();
  });
});
