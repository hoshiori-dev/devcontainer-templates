#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net=127.0.0.1 --allow-run=git,tar,docker,devcontainer,deno
import { parse, type ParseError, printParseErrorCode } from "npm:jsonc-parser@3.3.1";
import { compareVersions, validateStrict } from "npm:compare-versions@6.1.1";

export interface Metadata {
  id: string;
  version: string;
  name: string;
  description: string;
  [key: string]: unknown;
}
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const decoder = new TextDecoder();
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function jsonc(text: string): unknown {
  const errors: ParseError[] = [];
  const result = parse(text, errors, { allowTrailingComma: true });
  assert(
    !errors.length,
    `Invalid JSONC: ${errors.map((e) => printParseErrorCode(e.error)).join(", ")}`,
  );
  return result;
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function validateMetadata(value: unknown, id: string): Metadata {
  assert(object(value), "Metadata must be an object");
  for (const key of ["id", "version", "name", "description"]) {
    assert(typeof value[key] === "string" && value[key].length > 0, `Metadata requires ${key}`);
  }
  assert(value.id === id && idPattern.test(id), `Invalid or mismatched template id: ${id}`);
  assert(validateStrict(value.version as string), "Version must be valid SemVer");
  const keys = [
    "id",
    "version",
    "name",
    "description",
    "documentationURL",
    "licenseURL",
    "options",
    "platforms",
    "publisher",
    "keywords",
    "optionalPaths",
  ];
  for (const key of Object.keys(value)) {
    assert(keys.includes(key), `Unknown metadata property: ${key}`);
  }
  for (const key of ["documentationURL", "licenseURL", "publisher"]) {
    assert(value[key] === undefined || typeof value[key] === "string", `${key} must be a string`);
  }
  for (const key of ["documentationURL", "licenseURL"]) {
    if (value[key]) assert(/^https:\/\//.test(value[key] as string), `${key} must use HTTPS`);
  }
  for (const key of ["platforms", "keywords", "optionalPaths"]) {
    assert(
      value[key] === undefined ||
        (Array.isArray(value[key]) &&
          (value[key] as unknown[]).every((s) => typeof s === "string")),
      `${key} must be a string array`,
    );
  }
  if (value.optionalPaths) {
    for (const path of value.optionalPaths as string[]) {
      assert(
        path.length > 0 && !path.startsWith("/") && !path.includes("\\") &&
          !path.includes(":") && !path.split("/").some((part) => ["", ".", ".."].includes(part)) &&
          (!path.includes("*") || (path.endsWith("/*") && !path.slice(0, -2).includes("*"))),
        `Unsafe optional path: ${path}`,
      );
    }
  }
  if (value.options !== undefined) {
    assert(object(value.options), "Options must be an object");
    for (const [key, option] of Object.entries(value.options)) {
      assert(/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key) && object(option), `Invalid option: ${key}`);
      assert(["string", "boolean"].includes(option.type as string), `Invalid option type: ${key}`);
      assert(
        typeof option.description === "string" && typeof option.default === "string",
        `Option ${key} requires description and string default`,
      );
      assert(
        !(option.enum && option.proposals),
        `Option ${key} cannot have both enum and proposals`,
      );
      for (const field of ["enum", "proposals"]) {
        if (option[field] !== undefined) {
          assert(
            Array.isArray(option[field]) &&
              (option[field] as unknown[]).every((x) => typeof x === "string"),
            `Option ${key} ${field} must be a string array`,
          );
        }
      }
      if (option.enum) {
        assert(
          (option.enum as string[]).includes(option.default),
          `Option ${key} default is outside enum`,
        );
      }
      if (option.type === "boolean") {
        assert(
          ["true", "false"].includes(option.default),
          `Option ${key} boolean default must be true or false`,
        );
      }
    }
  }
  return value as Metadata;
}
async function command(
  args: string[],
  cwd = Deno.cwd(),
  quiet = false,
  signal?: AbortSignal,
): Promise<string> {
  const result = await new Deno.Command(args[0], {
    args: args.slice(1),
    cwd,
    stdout: "piped",
    stderr: quiet ? "piped" : "inherit",
    signal,
  }).output();
  const stdout = decoder.decode(result.stdout).trim();
  assert(
    result.success,
    `Command failed (${result.code}): ${args.join(" ")}\n${stdout}${
      quiet ? `\n${decoder.decode(result.stderr)}` : ""
    }`,
  );
  return stdout;
}
async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}
async function ids(root: string): Promise<string[]> {
  const result = [];
  for await (const entry of Deno.readDir(`${root}/src`)) {
    assert(entry.isDirectory && idPattern.test(entry.name), `Unexpected src entry: ${entry.name}`);
    result.push(entry.name);
  }
  return result.sort();
}
async function files(root: string, prefix = ""): Promise<string[]> {
  const result: string[] = [];
  for await (const entry of Deno.readDir(`${root}/${prefix}`)) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert(!entry.isSymlink, `Symlinks are not allowed in templates: ${path}`);
    if (entry.isDirectory) result.push(...await files(root, path));
    else result.push(path);
  }
  return result.sort();
}
export async function changedPaths(root: string, base: string): Promise<string[]> {
  // Include staged, unstaged, and new files so local checks match the next commit.
  const tracked = await command(["git", "diff", "--name-only", "-z", base, "--"], root, true);
  const untracked = await command(
    ["git", "ls-files", "--others", "--exclude-standard", "-z"],
    root,
    true,
  );
  return [...new Set(`${tracked}\0${untracked}`.split("\0").filter(Boolean))];
}
export function selectAffected(paths: string[], all: string[]): string[] {
  if (
    paths.some((p) =>
      /^(scripts\/|\.github\/(workflows|actions)\/|\.devcontainer\/|deno\.jsonc?$|justfile$|\.pre-commit-config\.yaml$)/
        .test(p) || (p.startsWith("test/") && !all.some((id) => p.startsWith(`test/${id}/`)))
    )
  ) return all;
  return all.filter((id) =>
    paths.some((p) =>
      p.startsWith(`src/${id}/`) ||
      p.startsWith(`test/${id}/`)
    )
  );
}
export function requireVersionIncrease(oldVersion: string, newVersion: string): void {
  assert(
    compareVersions(newVersion, oldVersion) > 0,
    `Template payload changed: increment version above ${oldVersion}`,
  );
}
export async function validate(root: string, base?: string): Promise<Metadata[]> {
  const changed = base ? await changedPaths(root, base) : [];
  const templates = [];
  for (const id of await ids(root)) {
    const directory = `${root}/src/${id}`;
    const metadata = validateMetadata(
      JSON.parse(await Deno.readTextFile(`${directory}/devcontainer-template.json`)),
      id,
    );
    const config = jsonc(await Deno.readTextFile(`${directory}/.devcontainer/devcontainer.json`));
    assert(object(config), `${id}: devcontainer.json must be an object`);
    assert(
      typeof config.image === "string" || object(config.build) ||
        config.dockerComposeFile !== undefined,
      `${id}: devcontainer.json requires image, build, or dockerComposeFile`,
    );
    const options = (metadata.options ?? {}) as Record<string, unknown>;
    for (const file of await files(directory)) {
      assert(!/(^|\/)(\.git|node_modules|\.env)(\/|$)/.test(file), `Unpublishable path: ${file}`);
      const content = await Deno.readTextFile(`${directory}/${file}`);
      for (const match of content.matchAll(/\$\{templateOption:([^}]+)\}/g)) {
        assert(match[1] in options, `${id}: undeclared template option ${match[1]}`);
      }
    }
    if (base && changed.some((p) => p.startsWith(`src/${id}/`))) {
      const path = `src/${id}/devcontainer-template.json`;
      const oldExists = await new Deno.Command("git", {
        args: ["cat-file", "-e", `${base}:${path}`],
        cwd: root,
        stdout: "null",
        stderr: "null",
      }).output();
      if (oldExists.success) {
        const old = JSON.parse(await command(["git", "show", `${base}:${path}`], root, true));
        requireVersionIncrease(old.version, metadata.version);
      }
    }
    templates.push(metadata);
  }
  assert(templates.length > 0, "At least one template is required");
  return templates;
}
export function templateReadme(metadata: Metadata, notes: string): string {
  return `<!-- Generated by just docs. Edit metadata and NOTES.md instead. -->\n# ${metadata.name}\n\n${metadata.description}\n\n## Use\n\nTemplate reference: \`ghcr.io/hoshiori-dev/devcontainer-templates/${metadata.id}:${metadata.version}\`\n\nApply with the Dev Container CLI:\n\n\`\`\`sh\ndevcontainer templates apply --template-id ghcr.io/hoshiori-dev/devcontainer-templates/${metadata.id}:${metadata.version}\n\`\`\`\n\n## Notes\n\n${notes.trim()}\n`;
}
async function formatMarkdown(text: string): Promise<string> {
  const process = new Deno.Command("deno", {
    args: ["fmt", "--ext", "md", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(text));
  await writer.close();
  const result = await process.output();
  assert(result.success, "Failed to format generated Markdown");
  return decoder.decode(result.stdout);
}
export async function docs(root: string, check: boolean): Promise<void> {
  const templates = await validate(root);
  for (const metadata of templates) {
    const notes = await Deno.readTextFile(`${root}/src/${metadata.id}/NOTES.md`);
    const expected = await formatMarkdown(templateReadme(metadata, notes));
    const path = `${root}/src/${metadata.id}/README.md`;
    if (check) {
      assert(
        await exists(path) && await Deno.readTextFile(path) === expected,
        `Stale generated documentation: ${path}`,
      );
    } else await Deno.writeTextFile(path, expected);
  }
  const start = "<!-- templates:start -->", end = "<!-- templates:end -->";
  for (const filename of ["README.md", "README.zh.md"]) {
    const path = `${root}/${filename}`;
    const current = await Deno.readTextFile(path);
    assert(
      current.includes(start) && current.includes(end) &&
        current.indexOf(start) < current.indexOf(end),
      `${filename} requires ordered templates:start/end markers`,
    );
    const heading = filename === "README.zh.md"
      ? "模板 | 版本 | 描述"
      : "Template | Version | Description";
    const table = `\n\n${
      (await formatMarkdown(
        `| ${heading} |\n| --- | --- | --- |\n${
          templates.map((t) =>
            `| [${t.name}](src/${t.id}/README.md) | ${t.version} | ${t.description} |`
          )
            .join("\n")
        }\n`,
      )).trim()
    }\n\n`;
    const expected = current.slice(0, current.indexOf(start) + start.length) + table +
      current.slice(current.indexOf(end));
    if (check) assert(current === expected, `Stale template index in ${filename}; run just docs`);
    else await Deno.writeTextFile(path, expected);
  }
}
export async function packageTemplates(root: string, id?: string): Promise<string> {
  const templates = await validate(root);
  if (id) assert(templates.some((t) => t.id === id), `Unknown template: ${id}`);
  const output = `${root}/build/package-${crypto.randomUUID()}`;
  await Deno.mkdir(output, { recursive: true });
  const selected = templates.filter((t) => !id || t.id === id);
  // Package the distribution format directly for local inspection.
  await Deno.writeTextFile(
    `${output}/devcontainer-collection.json`,
    `${
      JSON.stringify(
        {
          sourceInformation: {
            source: "https://github.com/hoshiori-dev/devcontainer-templates",
            revision: await command(["git", "rev-parse", "HEAD"], root),
          },
          templates: selected,
        },
        null,
        2,
      )
    }\n`,
  );
  for (const metadata of selected) {
    await command([
      "tar",
      "-czf",
      `${output}/devcontainer-template-${metadata.id}.tgz`,
      "-C",
      `${root}/src/${metadata.id}`,
      ".",
    ], root);
  }
  for (const metadata of selected) {
    const entries =
      (await command(["tar", "-tzf", `${output}/devcontainer-template-${metadata.id}.tgz`], root))
        .split("\n").filter((p) => !p.endsWith("/")).map((p) => p.replace(/^\.\//, "")).sort();
    const sourceFiles = await files(`${root}/src/${metadata.id}`);
    assert(
      JSON.stringify(entries) === JSON.stringify(sourceFiles),
      `Packaged files differ from src/${metadata.id}`,
    );
  }
  return output;
}
export async function testTemplate(root: string, id: string): Promise<void> {
  const metadata = (await validate(root)).find((t) => t.id === id);
  assert(metadata, `Unknown template: ${id}`);
  const token = `template-test-${crypto.randomUUID()}`;
  const directory = await Deno.makeTempDir({ prefix: `${token}-` });
  const workspace = `${directory}/workspace`;
  const label = `devcontainer-templates.test=${token}`;
  const controller = new AbortController();
  const interrupt = () => controller.abort();
  const run = (args: string[]) => command(args, root, false, controller.signal);
  Deno.addSignalListener("SIGINT", interrupt);
  Deno.addSignalListener("SIGTERM", interrupt);
  try {
    await Deno.mkdir(workspace);
    await run([
      "docker",
      "run",
      "-d",
      "--name",
      token,
      "--label",
      label,
      "-p",
      "127.0.0.1::5000",
      "registry:2.8.3",
    ]);
    const address = await run(["docker", "port", token, "5000/tcp"]);
    assert(/^127\.0\.0\.1:\d+$/.test(address), `Unexpected registry address: ${address}`);
    // The CLI intentionally uses HTTP only for the literal localhost hostname.
    const registry = address.replace("127.0.0.1:", "localhost:");
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      controller.signal.throwIfAborted();
      try {
        const response = await fetch(`http://${address}/v2/`, { signal: controller.signal });
        await response.body?.cancel();
        ready = response.ok;
      } catch { /* Registry is starting. */ }
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert(ready, "Temporary registry did not become ready");
    await run([
      "devcontainer",
      "templates",
      "publish",
      `${root}/src/${id}`,
      "--registry",
      registry,
      "--namespace",
      "test/templates",
    ]);
    const manifest = await fetch(
      `http://${address}/v2/test/templates/${id}/manifests/${metadata.version}`,
      {
        headers: { Accept: "application/vnd.oci.image.manifest.v1+json" },
        signal: controller.signal,
      },
    );
    assert(manifest.ok, "Cannot fetch locally published manifest");
    const manifestBytes = await manifest.arrayBuffer();
    const digest = `sha256:${
      Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", manifestBytes)))
        .map((b) => b.toString(16).padStart(2, "0")).join("")
    }`;
    assert(manifest.headers.get("docker-content-digest") === digest, "Manifest digest mismatch");
    await run([
      "devcontainer",
      "templates",
      "apply",
      "--workspace-folder",
      workspace,
      "--template-id",
      `${registry}/test/templates/${id}@${digest}`,
    ]);
    // The registry shares the ownership label; select only the workspace container for CLI reuse.
    const workspaceLabel = "devcontainer-templates.role=workspace";
    await run([
      "devcontainer",
      "up",
      "--workspace-folder",
      workspace,
      "--id-label",
      label,
      "--id-label",
      workspaceLabel,
    ]);
    const assertion = await Deno.readTextFile(`${root}/test/${id}/test.sh`);
    await Deno.writeTextFile(`${workspace}/template-test.sh`, assertion);
    await run([
      "devcontainer",
      "exec",
      "--workspace-folder",
      workspace,
      "--id-label",
      label,
      "--id-label",
      workspaceLabel,
      "bash",
      "/workspaces/workspace/template-test.sh",
    ]);
  } finally {
    Deno.removeSignalListener("SIGINT", interrupt);
    Deno.removeSignalListener("SIGTERM", interrupt);
    try {
      const containers = await command(["docker", "ps", "-aq", "--filter", `label=${label}`], root);
      // -v removes each owned container's anonymous volumes, including registry storage.
      if (containers) await command(["docker", "rm", "-fv", ...containers.split("\n")], root);
    } finally {
      await Deno.remove(directory, { recursive: true });
    }
  }
}
if (import.meta.main) {
  try {
    const [action, ...args] = Deno.args;
    const baseIndex = args.indexOf("--base");
    const base = baseIndex >= 0 ? args[baseIndex + 1] : undefined;
    assert(baseIndex < 0 || base, "--base requires a ref");
    const positional = args.filter((_, index) =>
      baseIndex < 0 || (index !== baseIndex && index !== baseIndex + 1)
    );
    assert(positional.length <= 1, "Expected at most one template id");
    const id = positional[0];
    const root = Deno.cwd();
    switch (action) {
      case "validate":
        await validate(root, base);
        break;
      case "docs":
        await docs(root, false);
        break;
      case "docs-check":
        await docs(root, true);
        break;
      case "affected":
        assert(base, "affected requires --base REF");
        console.log(
          JSON.stringify(selectAffected(await changedPaths(root, base), await ids(root))),
        );
        break;
      case "package":
        console.log(await packageTemplates(root, id));
        break;
      case "test":
        assert(id, "test requires a template id");
        await testTemplate(root, id);
        break;
      default:
        throw new Error(
          "Usage: template.ts <validate|docs|docs-check|affected|test|package> [id] [--base REF]",
        );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
