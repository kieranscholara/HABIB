#!/usr/bin/env node
// Uses only Node built-ins, so a downloaded copy can run before npm ci.
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";

const execute = promisify(execFile);
const archiveUrl =
  "https://codeload.github.com/kieranscholara/HABIB/zip/refs/heads/main";
const managed = [
  "src",
  "public",
  "scripts",
  "supabase",
  "tests",
  "docs",
  ".github",
  "AGENTS.md",
  "README.md",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next-env.d.ts",
  "next.config.ts",
  "playwright.config.ts",
  "vitest.config.ts",
  ".gitignore",
  ".env.example",
];
const excluded = new Set(["node_modules", ".next", ".git"]);

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function packageAt(directory) {
  try {
    return JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  } catch {
    return null;
  }
}

async function assertNoLinks(directory) {
  const stat = await lstat(directory);
  if (stat.isSymbolicLink())
    throw new Error(
      "Code contains a symbolic link; update stopped before replacing files.",
    );
  if (stat.isDirectory()) {
    for (const name of await readdir(directory))
      await assertNoLinks(join(directory, name));
  } else if (!stat.isFile()) {
    throw new Error("Code contains an unsupported file type.");
  }
}

export async function verifySource(directory) {
  await assertNoLinks(directory);
  if ((await packageAt(directory))?.name !== "habib-ai")
    throw new Error("The download is not a HABIB release.");
  for (const name of [
    "package-lock.json",
    "src/app/tutor/page.tsx",
    "src/app/homework/page.tsx",
  ]) {
    if (!(await exists(join(directory, name))))
      throw new Error(`Incomplete release: missing ${name}.`);
  }
}

// Validate before extraction: symlinks in ZIPs can escape even with safe entry names.
export function validateArchiveListing(names, details) {
  const entries = names.trim().split(/\r?\n/);
  if (!entries.length || entries.length > 10000)
    throw new Error("Unexpected archive size.");
  let root;
  for (const entry of entries) {
    const parts = entry.replace(/\/$/, "").split("/");
    if (
      entry.includes("\\") ||
      parts.some((part) => !part || part === "." || part === "..") ||
      /^[A-Za-z]:/.test(entry)
    ) {
      throw new Error("Unsafe path in archive.");
    }
    root ??= parts[0];
    if (root !== parts[0])
      throw new Error("Archive must contain one release folder.");
  }
  let total = 0;
  let count = 0;
  for (const line of details.split(/\r?\n/)) {
    const match = line.match(/^([dl-][rwxstST-]{6,9})\s+\S+\s+\S+\s+(\d+)\s/);
    if (!match) continue;
    count++;
    if (match[1][0] !== "-" && match[1][0] !== "d")
      throw new Error("Symbolic links are not allowed in the download.");
    total += Number(match[2]);
  }
  if (count !== entries.length || total > 256 * 1024 * 1024)
    throw new Error("Cannot safely verify archive contents.");
  return root;
}

export async function unpackArchive(archive, destination) {
  const { stdout: names } = await execute("unzip", ["-Z", "-1", archive], {
    maxBuffer: 4 * 1024 * 1024,
  });
  const { stdout: details } = await execute("unzip", ["-Z", "-l", archive], {
    maxBuffer: 4 * 1024 * 1024,
  });
  const root = validateArchiveListing(names, details);
  await mkdir(destination, { recursive: true, mode: 0o700 });
  await execute("unzip", ["-q", archive, "-d", destination]);
  const source = join(destination, root);
  await verifySource(source);
  return source;
}

async function download(destination) {
  // curl also honours the HTTPS proxy used by the cloud workspace.
  try {
    await execute("curl", [
      "--fail",
      "--show-error",
      "--silent",
      "--location",
      "--connect-timeout",
      "15",
      "--max-time",
      "120",
      "--max-filesize",
      "33554432",
      "--output",
      destination,
      archiveUrl,
    ]);
  } catch {
    throw new Error(
      "Could not download from GitHub. Check your internet connection. For a private repository, download its ZIP while signed in and pass --archive /path/to/HABIB-main.zip.",
    );
  }
  if ((await lstat(destination)).size > 32 * 1024 * 1024)
    throw new Error("Download exceeds the update size limit.");
  await chmod(destination, 0o600);
}

// Compare every backed-up file without displaying settings or database contents.
async function inventory(directory, excludeRoot = false) {
  const records = [];
  async function walk(path, key) {
    const stat = await lstat(path);
    if (stat.isSymbolicLink())
      records.push([key, "link", await readlink(path)]);
    else if (stat.isDirectory()) {
      records.push([key, "directory"]);
      for (const name of (await readdir(path)).sort()) {
        if (!key && excludeRoot && excluded.has(name)) continue;
        await walk(join(path, name), key ? `${key}/${name}` : name);
      }
    } else if (stat.isFile()) {
      records.push([
        key,
        "file",
        createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      ]);
    } else throw new Error("Cannot back up an unsupported local file type.");
  }
  await walk(directory, "");
  return JSON.stringify(records);
}

function inside(parent, child) {
  const path = relative(parent, child);
  return (
    path === "" ||
    (!path.startsWith(`..${sep}`) && path !== ".." && !path.startsWith(sep))
  );
}

export async function installDependencies(directory) {
  await new Promise((accept, reject) => {
    const child = spawn("npm", ["ci"], { cwd: directory, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) accept();
      else reject(new Error(`npm ci failed (${signal ?? code}).`));
    });
  });
}

export async function applyUpdate(
  directory,
  source,
  install = installDependencies,
) {
  const target = await realpath(directory);
  source = await realpath(source);
  if (inside(target, source) || inside(source, target))
    throw new Error("Update source and app folder must be separate.");
  if ((await packageAt(target))?.name !== "habib-ai")
    throw new Error(
      "Choose your existing HABIB folder, containing package.json.",
    );
  for (const name of [".next/dev/lock", ".next/lock"]) {
    if (await exists(join(target, name)))
      throw new Error(
        "HABIB appears to be running. Press Control+C in its Terminal window before updating.",
      );
  }
  await verifySource(source);
  for (const name of managed) {
    if (await exists(join(target, name)))
      await assertNoLinks(join(target, name));
  }
  const backup = await mkdtemp(
    join(dirname(target), `${basename(target)}-backup-`),
  );
  await chmod(backup, 0o700);
  await cp(target, backup, {
    recursive: true,
    dereference: false,
    verbatimSymlinks: true,
    filter: (path) => !excluded.has(relative(target, path)),
  });
  if ((await inventory(target, true)) !== (await inventory(backup))) {
    throw new Error(
      `Backup verification failed; no app files were changed. Backup: ${backup}`,
    );
  }
  console.log(`Verified backup: ${backup}`);
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  try {
    for (const name of managed) {
      await rm(join(target, name), { recursive: true, force: true });
      if (await exists(join(source, name)))
        await cp(join(source, name), join(target, name), { recursive: true });
    }
    if (interrupted) throw new Error("Update interrupted.");
    await install(target);
    if (interrupted) throw new Error("Update interrupted.");
    await rm(join(target, ".next"), { recursive: true, force: true });
  } catch (error) {
    try {
      for (const name of managed) {
        await rm(join(target, name), { recursive: true, force: true });
        if (await exists(join(backup, name)))
          await cp(join(backup, name), join(target, name), { recursive: true });
      }
    } catch {
      throw new Error(
        `Update failed and automatic code restoration failed. Your complete backup is at ${backup}. Settings and saved data were never replaced.`,
      );
    }
    throw new Error(
      `${error.message}\nPrevious code restored. Settings and saved data were never replaced. Run npm ci before restarting the previous version. Backup: ${backup}`,
    );
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
  return { target, backup, version: (await packageAt(target)).version };
}

async function chooseDirectory(explicit) {
  if (explicit) return resolve(explicit);
  if ((await packageAt(process.cwd()))?.name === "habib-ai")
    return process.cwd();
  const candidates = [];
  const downloads = join(homedir(), "Downloads");
  if (await exists(downloads)) {
    for (const name of (await readdir(downloads)).sort()) {
      if (!/^HABIB/i.test(name) || name.includes("-backup-")) continue;
      const path = join(downloads, name);
      if ((await packageAt(path))?.name === "habib-ai") candidates.push(path);
    }
  }
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1 && process.stdin.isTTY) {
    console.log("Choose the HABIB folder you currently use:");
    candidates.forEach((path, index) => console.log(`${index + 1}. ${path}`));
    const prompt = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      const answer = await prompt.question("Folder number: ");
      if (/^[1-9]\d*$/.test(answer) && candidates[Number(answer) - 1])
        return candidates[Number(answer) - 1];
    } finally {
      prompt.close();
    }
  }
  throw new Error(
    'Open Terminal in your HABIB folder, or pass --directory "/path/to/HABIB".',
  );
}

async function main() {
  const args = process.argv.slice(2);
  let directory, archive;
  let start = false,
    check = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--start") start = true;
    else if (args[index] === "--check") check = true;
    else if (
      ["--directory", "--archive"].includes(args[index]) &&
      args[index + 1] &&
      !args[index + 1].startsWith("--")
    ) {
      if (args[index] === "--directory") directory = args[++index];
      else archive = resolve(args[++index]);
    } else
      throw new Error(
        "Usage: node update-local.mjs [--directory folder] [--archive zip] [--start | --check]",
      );
  }
  if (check && start)
    throw new Error("--check cannot start or update the app.");
  if (Number(process.versions.node.split(".")[0]) !== 24)
    throw new Error(
      "Install Node.js 24 LTS from https://nodejs.org, reopen Terminal, and retry.",
    );
  const target = check ? null : await chooseDirectory(directory);
  const temporary = await mkdtemp(join(tmpdir(), "habib-update-"));
  let result;
  try {
    if (!archive) {
      archive = join(temporary, "release.zip");
      console.log("Downloading HABIB from GitHub…");
      await download(archive);
    }
    const source = await unpackArchive(archive, join(temporary, "release"));
    if (check) {
      console.log(
        `Verified HABIB ${(await packageAt(source)).version} download. No local app files changed.`,
      );
      return;
    }
    console.log(`Updating ${target}`);
    result = await applyUpdate(target, source);
    console.log(
      `Updated to HABIB ${result.version}. Azure settings and saved progress preserved.`,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  if (start) {
    console.log(
      "Starting HABIB. Open the Local address printed below. Stop with Control+C.",
    );
    const child = spawn("npm", ["run", "dev"], {
      cwd: result.target,
      stdio: "inherit",
    });
    child.on("error", (error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
    child.on("exit", (code, signal) => {
      process.exitCode = code ?? (signal === "SIGINT" ? 0 : 1);
    });
  } else
    console.log(
      `To launch: open Terminal in ${result.target} and run npm run dev.`,
    );
}

// Node resolves the module URL through symlinks, but argv retains the supplied
// path. On macOS /tmp points to /private/tmp; compare canonical paths so the
// downloaded updater runs instead of silently being treated as an import.
const entryPath = process.argv[1]
  ? await realpath(resolve(process.argv[1])).catch(() =>
      resolve(process.argv[1]),
    )
  : null;
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  main().catch((error) => {
    console.error(`Update stopped: ${error.message}`);
    process.exitCode = 1;
  });
}
