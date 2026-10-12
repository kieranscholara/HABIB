import { afterEach, describe, expect, it, vi } from "vitest";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyUpdate,
  validateArchiveListing,
  verifySource,
} from "../scripts/update-local.mjs";

const temporary: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporary
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "habib-updater-test-"));
  temporary.push(root);
  const target = join(root, "HABIB-main 2");
  const source = join(root, "release");
  for (const directory of [target, source]) {
    await mkdir(join(directory, "src/app/tutor"), { recursive: true });
    await mkdir(join(directory, "src/app/homework"), { recursive: true });
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({
        name: "habib-ai",
        version: directory === target ? "0.2.0" : "0.3.0",
      }),
    );
    await writeFile(join(directory, "package-lock.json"), "fixture lock");
    await writeFile(
      join(directory, "src/app/tutor/page.tsx"),
      directory === target ? "old tutor" : "new tutor",
    );
    await writeFile(join(directory, "src/app/homework/page.tsx"), "homework");
  }
  await writeFile(join(target, "src/local-edit.ts"), "my customised code");
  await writeFile(join(target, ".env.local"), "HABIB_SPEECH_KEY=fixture-only");
  await chmod(join(target, ".env.local"), 0o600);
  await mkdir(join(target, ".habib"));
  await writeFile(
    join(target, ".habib/development.sqlite"),
    "fixture profiles",
  );
  await writeFile(
    join(target, ".habib/development.sqlite-wal"),
    "fixture progress",
  );
  await writeFile(join(target, "my-notes.txt"), "keep me");
  await mkdir(join(target, ".git"));
  await writeFile(join(target, ".git/HEAD"), "fixture git metadata");
  await mkdir(join(target, "node_modules"));
  await writeFile(
    join(target, "node_modules/old.txt"),
    "generated dependencies",
  );
  await mkdir(join(target, ".next"));
  await writeFile(join(target, ".next/cache"), "old build");
  vi.spyOn(console, "log").mockImplementation(() => {});
  return { target, source, root };
}

describe("downloaded-copy updater", () => {
  it("updates a folder with spaces and preserves settings/data, with a protected complete code backup", async () => {
    const { target, source } = await fixture();
    const install = vi.fn(async (path: string) => {
      expect(path).toBe(target);
      expect(await readFile(join(path, "src/app/tutor/page.tsx"), "utf8")).toBe(
        "new tutor",
      );
    });
    const result = await applyUpdate(target, source, install);
    expect(install).toHaveBeenCalledOnce();
    expect(result.version).toBe("0.3.0");
    expect(await readFile(join(target, ".env.local"), "utf8")).toBe(
      "HABIB_SPEECH_KEY=fixture-only",
    );
    expect((await lstat(join(target, ".env.local"))).mode & 0o777).toBe(0o600);
    expect(
      await readFile(join(target, ".habib/development.sqlite"), "utf8"),
    ).toBe("fixture profiles");
    expect(
      await readFile(join(target, ".habib/development.sqlite-wal"), "utf8"),
    ).toBe("fixture progress");
    expect(await readFile(join(target, "my-notes.txt"), "utf8")).toBe(
      "keep me",
    );
    expect(await readFile(join(target, ".git/HEAD"), "utf8")).toBe(
      "fixture git metadata",
    );
    await expect(
      lstat(join(target, "src/local-edit.ts")),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect((await lstat(result.backup)).mode & 0o777).toBe(0o700);
    expect(
      await readFile(join(result.backup, "src/local-edit.ts"), "utf8"),
    ).toBe("my customised code");
    expect(await readFile(join(result.backup, ".env.local"), "utf8")).toBe(
      "HABIB_SPEECH_KEY=fixture-only",
    );
    expect(
      await readFile(
        join(result.backup, ".habib/development.sqlite-wal"),
        "utf8",
      ),
    ).toBe("fixture progress");
    expect(await readdir(result.backup)).not.toContain("node_modules");
    await expect(lstat(join(target, ".next"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("restores local code and customised files if npm installation fails", async () => {
    const { target, source } = await fixture();
    await expect(
      applyUpdate(target, source, async () => {
        throw new Error("offline npm");
      }),
    ).rejects.toThrow("Previous code restored");
    expect(await readFile(join(target, "src/app/tutor/page.tsx"), "utf8")).toBe(
      "old tutor",
    );
    expect(await readFile(join(target, "src/local-edit.ts"), "utf8")).toBe(
      "my customised code",
    );
    expect(
      JSON.parse(await readFile(join(target, "package.json"), "utf8")).version,
    ).toBe("0.2.0");
    expect(await readFile(join(target, ".env.local"), "utf8")).toBe(
      "HABIB_SPEECH_KEY=fixture-only",
    );
    expect(
      await readFile(join(target, ".habib/development.sqlite"), "utf8"),
    ).toBe("fixture profiles");
    expect(await readFile(join(target, ".next/cache"), "utf8")).toBe(
      "old build",
    );
  });

  it("rejects a running app before any backup or code replacement", async () => {
    const { target, source, root } = await fixture();
    await mkdir(join(target, ".next/dev"));
    await writeFile(join(target, ".next/dev/lock"), "running");
    await expect(applyUpdate(target, source, vi.fn())).rejects.toThrow(
      "Control+C",
    );
    expect(await readdir(root)).toEqual(["HABIB-main 2", "release"]);
    expect(await readFile(join(target, "src/local-edit.ts"), "utf8")).toBe(
      "my customised code",
    );
  });

  it("restores previous code when an update is interrupted", async () => {
    const { target, source } = await fixture();
    const listeners = process.listenerCount("SIGINT");
    await expect(
      applyUpdate(target, source, async () => {
        process.emit("SIGINT");
      }),
    ).rejects.toThrow("Previous code restored");
    expect(process.listenerCount("SIGINT")).toBe(listeners);
    expect(await readFile(join(target, "src/app/tutor/page.tsx"), "utf8")).toBe(
      "old tutor",
    );
    expect(await readFile(join(target, "src/local-edit.ts"), "utf8")).toBe(
      "my customised code",
    );
  });

  it("rejects incomplete releases and code symlinks before changing the app", async () => {
    const { target, source, root } = await fixture();
    await rm(join(source, "src/app/homework/page.tsx"));
    await expect(applyUpdate(target, source, vi.fn())).rejects.toThrow(
      "Incomplete release",
    );
    await writeFile(join(source, "src/app/homework/page.tsx"), "homework");
    await symlink(
      join(target, ".env.local"),
      join(source, "src/linked-secret.ts"),
    );
    await expect(verifySource(source)).rejects.toThrow("symbolic link");
    expect(await readdir(root)).toEqual(["HABIB-main 2", "release"]);
  });

  it("refuses unrelated folders and overlapping source/target", async () => {
    const { target, source, root } = await fixture();
    await expect(applyUpdate(root, source, vi.fn())).rejects.toThrow(
      "must be separate",
    );
    await writeFile(
      join(target, "package.json"),
      JSON.stringify({ name: "other-project" }),
    );
    await expect(applyUpdate(target, source, vi.fn())).rejects.toThrow(
      "existing HABIB folder",
    );
  });

  it("handles GitHub FAT-mode ZIP metadata and rejects traversal, links and oversized archives", () => {
    const names = "HABIB-main/\nHABIB-main/package.json\n";
    const details =
      "drwx---     0.0 fat        0 bx 0 stor\n-rw----     0.0 fat      100 tx 0 defN\n";
    expect(validateArchiveListing(names, details)).toBe("HABIB-main");
    for (const entry of [
      "/tmp/evil",
      "HABIB-main/../../evil",
      "HABIB-main/../evil",
      "C:/evil",
      "HABIB-main\\evil",
      "HABIB-main//evil",
    ]) {
      expect(() => validateArchiveListing(entry, details)).toThrow();
    }
    expect(() =>
      validateArchiveListing(names, details.replace("-rw----", "lrwxrwxrwx")),
    ).toThrow("Symbolic links");
    expect(() =>
      validateArchiveListing(names, details.replace("100", "999999999")),
    ).toThrow("safely verify");
    expect(() =>
      validateArchiveListing(names, "unrecognised metadata"),
    ).toThrow("safely verify");
  });
});
