let saveHandler: (() => Promise<boolean>) | null = null;

export function registerSaveHandler(handler: () => Promise<boolean>) {
  saveHandler = handler;
}

export async function triggerSave(): Promise<boolean> {
  if (!saveHandler) return false;
  return saveHandler();
}
