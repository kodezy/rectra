import { describe, expect, it } from "vitest";
import { fileActionTitle, fileShortcut, modLabel } from "@ui/shell/shortcuts";

function key(
  key: string,
  opts: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {},
): Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey"> {
  return {
    key,
    metaKey: opts.meta ?? false,
    ctrlKey: opts.ctrl ?? false,
    shiftKey: opts.shift ?? false,
  };
}

describe("fileShortcut", () => {
  it("maps Ctrl/Cmd+N/O/S/E without Shift", () => {
    expect(fileShortcut(key("n", { ctrl: true }))).toBe("new");
    expect(fileShortcut(key("O", { meta: true }))).toBe("open");
    expect(fileShortcut(key("s", { ctrl: true }))).toBe("save");
    expect(fileShortcut(key("e", { meta: true }))).toBe("export");
  });

  it("ignores Shift modifiers", () => {
    expect(fileShortcut(key("s", { ctrl: true, shift: true }))).toBeNull();
    expect(fileShortcut(key("n", { meta: true, shift: true }))).toBeNull();
  });

  it("ignores unmodified keys", () => {
    expect(fileShortcut(key("s"))).toBeNull();
    expect(fileShortcut(key("n"))).toBeNull();
  });

  it("ignores other chords", () => {
    expect(fileShortcut(key("z", { ctrl: true }))).toBeNull();
  });
});

describe("modLabel and fileActionTitle", () => {
  it("uses Ctrl+ on non-Mac", () => {
    expect(modLabel(false)).toBe("Ctrl+");
    expect(fileActionTitle("Save", "S", false)).toBe("Save (Ctrl+S)");
  });

  it("uses ⌘ on Mac", () => {
    expect(modLabel(true)).toBe("⌘");
    expect(fileActionTitle("Save", "S", true)).toBe("Save (⌘S)");
  });
});
