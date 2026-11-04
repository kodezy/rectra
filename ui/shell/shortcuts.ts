type FileShortcutAction = "new" | "open" | "save" | "export";

function isMacPlatform(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

export function modLabel(mac = isMacPlatform()): string {
  return mac ? "⌘" : "Ctrl+";
}

export function fileActionTitle(action: string, key: string, mac = isMacPlatform()): string {
  const mod = modLabel(mac);
  return `${action} (${mod}${key})`;
}

export function fileShortcut(
  e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey">,
): FileShortcutAction | null {
  if (!e.metaKey && !e.ctrlKey) return null;
  if (e.shiftKey) return null;
  switch (e.key.toLowerCase()) {
    case "n":
      return "new";
    case "o":
      return "open";
    case "s":
      return "save";
    case "e":
      return "export";
    default:
      return null;
  }
}
