import { describe, expect, it } from "vitest";
import { joinPath } from "@core/persistence/paths";
import {
  commitExportDirectory,
  exportBackupDir,
  exportStagingDir,
  recoverExportDir,
  type ExportDirFs,
} from "@core/persistence/exportPackage";

describe("export work directories", () => {
  it("places staging and backup inside the chosen folder with a visible name", () => {
    expect(exportStagingDir("/out", "abc")).toBe("/out/rectra-export-abc");
    expect(exportBackupDir("/out", "9")).toBe("/out/rectra-backup-9");
    expect(exportStagingDir("C:\\Users\\me\\out", "abc")).toBe(
      "C:\\Users\\me\\out/rectra-export-abc",
    );
    expect(exportBackupDir("C:\\Users\\me\\out", "9")).toBe("C:\\Users\\me\\out/rectra-backup-9");

    for (const path of [
      exportStagingDir("/out", "abc"),
      exportBackupDir("/out", "9"),
      exportStagingDir("C:\\Users\\me\\out", "abc"),
    ]) {
      const name = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
      expect(name.startsWith(".")).toBe(false);
    }
  });
});

type Stored = { kind: "dir" } | { kind: "file"; mark: string };

function stored(value: "dir" | "file" | `file:${string}`): Stored {
  if (value === "dir") return { kind: "dir" };
  if (value === "file") return { kind: "file", mark: "" };
  return { kind: "file", mark: value.slice("file:".length) };
}

function memoryFs(
  seed: Record<string, "dir" | "file" | `file:${string}`>,
): ExportDirFs & { snapshot: () => string[]; mark: (path: string) => string | undefined } {
  const nodes = new Map<string, Stored>(
    Object.entries(seed).map(([path, value]) => [path, stored(value)]),
  );

  function descendants(root: string): string[] {
    const prefix = root.endsWith("/") ? root : `${root}/`;
    return [...nodes.keys()].filter((path) => path === root || path.startsWith(prefix));
  }

  return {
    snapshot: () => [...nodes.keys()],
    mark: (path) => {
      const node = nodes.get(path);
      return node?.kind === "file" ? node.mark : undefined;
    },
    async exists(path) {
      return nodes.has(path);
    },
    async mkdir(path) {
      if (nodes.has(path)) throw new Error(`exists: ${path}`);
      nodes.set(path, { kind: "dir" });
    },
    async remove(path, options) {
      const nested = descendants(path).filter((item) => item !== path);
      if (nested.length > 0 && !options?.recursive) throw new Error(`not empty: ${path}`);
      for (const item of descendants(path)) nodes.delete(item);
    },
    async rename(from, to) {
      if (!nodes.has(from)) throw new Error(`missing: ${from}`);
      if (nodes.has(to) || descendants(to).length > 0) throw new Error(`exists: ${to}`);
      const moved = descendants(from).map((path) => ({
        path,
        node: nodes.get(path)!,
        next: path === from ? to : `${to}${path.slice(from.length)}`,
      }));
      for (const item of moved) nodes.delete(item.path);
      for (const item of moved) nodes.set(item.next, item.node);
    },
    async readDir(dir) {
      if (!nodes.has(dir)) throw new Error(`missing: ${dir}`);
      const entries = [];
      for (const path of nodes.keys()) {
        if (path === dir) continue;
        const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
        const name = path.slice(slash + 1);
        if (joinPath(dir, name) !== path) continue;
        const node = nodes.get(path)!;
        entries.push({ name, isDirectory: node.kind === "dir", isFile: node.kind === "file" });
      }
      return entries;
    },
  };
}

function child(dir: string, name: string): string {
  return joinPath(dir, name);
}

describe("recoverExportDir", () => {
  it("does not delete a backup-like folder inside a finished package", async () => {
    const dest = "/out";
    const notes = joinPath(dest, "rectra-backup-notes");
    const fs = memoryFs({
      [dest]: "dir",
      [child(dest, "mappings.json")]: "file",
      [child(dest, "templates")]: "dir",
      [notes]: "dir",
      [joinPath(notes, "keep.txt")]: "file",
    });

    await recoverExportDir(dest, fs);

    expect(fs.snapshot()).toContain(joinPath(notes, "keep.txt"));
  });

  it("does not delete a folder that only shares the staging prefix", async () => {
    const dest = "/out";
    const notes = joinPath(dest, "rectra-export-notes");
    const fs = memoryFs({
      [dest]: "dir",
      [notes]: "dir",
      [joinPath(notes, "keep.txt")]: "file",
    });

    await recoverExportDir(dest, fs);

    expect(fs.snapshot()).toContain(joinPath(notes, "keep.txt"));
  });

  it("leaves an unrelated directory in place", async () => {
    const dest = "/out";
    const notes = joinPath(dest, "rectra-export-notes");
    const fs = memoryFs({
      [dest]: "dir",
      [joinPath(dest, "notes.txt")]: "file",
      [notes]: "dir",
      [joinPath(notes, "keep.txt")]: "file",
    });

    await recoverExportDir(dest, fs);

    expect(fs.snapshot()).toContain(joinPath(notes, "keep.txt"));
    expect(fs.snapshot()).toContain(joinPath(dest, "notes.txt"));
  });

  it("drops an interrupted staging directory and keeps the current package", async () => {
    const dest = "/out";
    const staging = exportStagingDir(dest, "11111111-1111-4111-8111-111111111111");
    const fs = memoryFs({
      [dest]: "dir",
      [child(dest, "mappings.json")]: "file",
      [child(dest, "templates")]: "dir",
      [child(child(dest, "templates"), "old.png")]: "file",
      [staging]: "dir",
      [child(staging, "mappings.json")]: "file",
      [child(staging, "templates")]: "dir",
      [child(child(staging, "templates"), "partial.png")]: "file",
    });

    await recoverExportDir(dest, fs);

    expect(fs.snapshot().sort()).toEqual(
      [
        dest,
        child(dest, "mappings.json"),
        child(dest, "templates"),
        child(child(dest, "templates"), "old.png"),
      ].sort(),
    );
  });

  it("restores the backup when the folder root has no complete package", async () => {
    const dest = "/out";
    const staging = exportStagingDir(dest, "11111111-1111-4111-8111-111111111111");
    const backup = exportBackupDir(dest, "9");
    const fs = memoryFs({
      [dest]: "dir",
      [child(dest, "mappings.json")]: "file:new",
      [staging]: "dir",
      [child(staging, "templates")]: "dir",
      [child(child(staging, "templates"), "new.png")]: "file",
      [backup]: "dir",
      [child(backup, "mappings.json")]: "file:old",
      [child(backup, "templates")]: "dir",
      [child(child(backup, "templates"), "old.png")]: "file",
    });

    await recoverExportDir(dest, fs);

    expect(fs.mark(child(dest, "mappings.json"))).toBe("old");
    expect(fs.snapshot().sort()).toEqual(
      [
        dest,
        child(dest, "mappings.json"),
        child(dest, "templates"),
        child(child(dest, "templates"), "old.png"),
      ].sort(),
    );
  });

  it("finishes a backup restore when only the templates move is left", async () => {
    const dest = "/out";
    const backup = exportBackupDir(dest, "9");
    const fs = memoryFs({
      [dest]: "dir",
      [child(dest, "mappings.json")]: "file:old",
      [backup]: "dir",
      [child(backup, "templates")]: "dir",
      [child(child(backup, "templates"), "old.png")]: "file",
    });

    await recoverExportDir(dest, fs);

    expect(fs.mark(child(dest, "mappings.json"))).toBe("old");
    expect(fs.snapshot().sort()).toEqual(
      [
        dest,
        child(dest, "mappings.json"),
        child(dest, "templates"),
        child(child(dest, "templates"), "old.png"),
      ].sort(),
    );
  });

  it("keeps a finished package and deletes the backup left beside it", async () => {
    const dest = "/out";
    const backup = exportBackupDir(dest, "9");
    const fs = memoryFs({
      [dest]: "dir",
      [child(dest, "mappings.json")]: "file:new",
      [child(dest, "templates")]: "dir",
      [child(child(dest, "templates"), "new.png")]: "file",
      [backup]: "dir",
      [child(backup, "mappings.json")]: "file:old",
      [child(backup, "templates")]: "dir",
      [child(child(backup, "templates"), "old.png")]: "file",
    });

    await recoverExportDir(dest, fs);

    expect(fs.mark(child(dest, "mappings.json"))).toBe("new");
    expect(fs.snapshot().sort()).toEqual(
      [
        dest,
        child(dest, "mappings.json"),
        child(dest, "templates"),
        child(child(dest, "templates"), "new.png"),
      ].sort(),
    );
  });
});

describe("commitExportDirectory", () => {
  it("publishes staging into an empty folder and keeps that folder", async () => {
    const dest = "/out";
    const staging = exportStagingDir(dest, "11111111-1111-4111-8111-111111111111");
    const fs = memoryFs({
      [dest]: "dir",
      [staging]: "dir",
      [child(staging, "mappings.json")]: "file",
      [child(staging, "templates")]: "dir",
      [child(child(staging, "templates"), "new.png")]: "file",
    });

    await commitExportDirectory(dest, staging, fs);

    const left = fs.snapshot().sort();
    expect(left).toEqual(
      [
        dest,
        child(dest, "mappings.json"),
        child(dest, "templates"),
        child(child(dest, "templates"), "new.png"),
      ].sort(),
    );
  });

  it("replaces a previous package and removes the work directories", async () => {
    const dest = "/out";
    const staging = exportStagingDir(dest, "11111111-1111-4111-8111-111111111111");
    const created: string[] = [];
    const base = memoryFs({
      [dest]: "dir",
      [child(dest, "mappings.json")]: "file",
      [child(dest, "templates")]: "dir",
      [child(child(dest, "templates"), "old.png")]: "file",
      [staging]: "dir",
      [child(staging, "mappings.json")]: "file",
      [child(staging, "templates")]: "dir",
      [child(child(staging, "templates"), "new.png")]: "file",
    });
    const fs: ExportDirFs = {
      ...base,
      async mkdir(path) {
        created.push(path);
        await base.mkdir(path);
      },
    };

    await commitExportDirectory(dest, staging, fs);

    const left = base.snapshot().sort();
    expect(left).toEqual(
      [
        dest,
        child(dest, "mappings.json"),
        child(dest, "templates"),
        child(child(dest, "templates"), "new.png"),
      ].sort(),
    );
    expect(created).toHaveLength(1);
    expect(created[0]).toMatch(/^\/out\/rectra-backup-\d+$/);
  });

  it("restores the previous package when publishing the new tree fails", async () => {
    const dest = "C:\\Users\\me\\out";
    const staging = exportStagingDir(dest, "11111111-1111-4111-8111-111111111111");
    const oldTemplates = child(child(dest, "templates"), "old.png");
    const base = memoryFs({
      [dest]: "dir",
      [child(dest, "mappings.json")]: "file",
      [child(dest, "templates")]: "dir",
      [oldTemplates]: "file",
      [staging]: "dir",
      [child(staging, "mappings.json")]: "file",
      [child(staging, "templates")]: "dir",
      [child(child(staging, "templates"), "new.png")]: "file",
    });
    let renames = 0;
    const fs: ExportDirFs = {
      ...base,
      async rename(from, to) {
        renames += 1;
        if (renames === 4) throw new Error("rename failed");
        await base.rename(from, to);
      },
    };

    await expect(commitExportDirectory(dest, staging, fs)).rejects.toThrow("rename failed");

    const left = base.snapshot().sort();
    expect(left).toEqual(
      [dest, child(dest, "mappings.json"), child(dest, "templates"), oldTemplates].sort(),
    );
  });

  it("leaves an empty folder empty when the publish fails", async () => {
    const dest = "/out";
    const staging = exportStagingDir(dest, "11111111-1111-4111-8111-111111111111");
    const base = memoryFs({
      [dest]: "dir",
      [staging]: "dir",
      [child(staging, "mappings.json")]: "file",
      [child(staging, "templates")]: "dir",
      [child(child(staging, "templates"), "new.png")]: "file",
    });
    let renames = 0;
    const fs: ExportDirFs = {
      ...base,
      async rename(from, to) {
        renames += 1;
        if (renames === 2) throw new Error("rename failed");
        await base.rename(from, to);
      },
    };

    await expect(commitExportDirectory(dest, staging, fs)).rejects.toThrow("rename failed");
    expect(base.snapshot()).toEqual([dest]);
  });
});
