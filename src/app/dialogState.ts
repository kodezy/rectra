export type DialogState =
  | { kind: "none" }
  | { kind: "export" }
  | { kind: "mapComponent"; screenId: string; anchorId: string }
  | { kind: "unsaved"; onResolve: (choice: "save" | "discard" | "cancel") => void }
  | { kind: "confirmDelete"; title: string; message: string; onConfirm: () => void }
  | { kind: "confirmReplace"; title: string; message: string; onConfirm: () => void };
