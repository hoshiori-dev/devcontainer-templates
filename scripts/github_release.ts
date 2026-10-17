#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env --allow-net --allow-run=git,gh,tar,devcontainer
/** Release phases run only on the exact, human-merged main commit. */
import { validateStrict } from "npm:compare-versions@6.1.1";
import { publishResult } from "./github.ts";
import { type Metadata, validate } from "./template.ts";
const decoder = new TextDecoder();
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function command(
  args: string[],
  capture = true,
  env?: Record<string, string>,
): Promise<string> {
  const output = await new Deno.Command(args[0], {
    args: args.slice(1),
    env,
    stdout: "piped",
    stderr: "inherit",
  }).output();
  assert(output.success, `${args[0]} failed (${output.code})`);
  const text = decoder.decode(output.stdout).trim();
  if (!capture && text) console.log(text);
  return text;
}
async function gh<T>(path: string, method?: string, data?: unknown): Promise<T> {
  const args = ["gh", "api", `repos/${Deno.env.get("GITHUB_REPOSITORY")}${path}`];
  if (method) args.push("--method", method);
  if (data) args.push("--input", "-");
  const child = new Deno.Command(args[0], {
    args: args.slice(1),
    stdin: data ? "piped" : "null",
    stdout: "piped",
    stderr: "inherit",
  }).spawn();
  if (data) {
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(JSON.stringify(data)));
    await writer.close();
  }
  const output = await child.output();
  assert(output.success, `GitHub ${path} failed`);
  return JSON.parse(decoder.decode(output.stdout) || "null") as T;
}
async function emit(name: string, value: string): Promise<void> {
  const file = Deno.env.get("GITHUB_OUTPUT");
  if (file) await Deno.writeTextFile(file, `${name}=${value}\n`, { append: true });
  else console.log(`${name}=${value}`);
}
export interface ReleaseItem {
  id: string;
  version: string;
  name: string;
  digest: string;
  source: string;
}
async function guard(): Promise<{ repository: string; sha: string }> {
  const repository = Deno.env.get("GITHUB_REPOSITORY");
  const sha = Deno.env.get("GITHUB_SHA");
  assert(
    repository === "hoshiori-dev/devcontainer-templates",
    "Release is restricted to the canonical repository",
  );
  assert(
    Deno.env.get("GITHUB_EVENT_NAME") === "push" &&
      Deno.env.get("GITHUB_REF") === "refs/heads/main",
    "Only a human-merged main push can release; no manual dispatch",
  );
  assert(sha && /^[a-f0-9]{40}$/.test(sha), "Invalid release SHA");
  assert(
    await command(["git", "rev-parse", "HEAD"]) === sha,
    "Checkout differs from the release commit",
  );
  const pulls = await gh<
    {
      number: number;
      merged: boolean;
      merge_commit_sha: string;
      base: { ref: string };
      merged_by: { login: string; type: string } | null;
    }[]
  >(`/commits/${sha}/pulls`);
  let accepted = false;
  for (const candidate of pulls) {
    const pr = await gh<typeof candidate>(`/pulls/${candidate.number}`);
    if (
      !pr.merged || pr.merge_commit_sha !== sha || pr.base.ref !== "main" ||
      pr.merged_by?.type !== "User"
    ) continue;
    const permission = await gh<
      {
        permission: string;
        role_name: string;
        user: { permissions?: { admin?: boolean; maintain?: boolean } };
      }
    >(`/collaborators/${encodeURIComponent(pr.merged_by.login)}/permission`);
    if (
      permission.permission === "admin" || permission.role_name === "maintain" ||
      permission.user.permissions?.admin || permission.user.permissions?.maintain
    ) accepted = true;
  }
  assert(
    accepted,
    "Publication requires this exact commit to belong to a PR merged into main by a human maintainer or admin; direct pushes cannot publish",
  );
  return { repository, sha };
}
async function registry(
  name: string,
  authenticated: boolean,
): Promise<(path: string) => Promise<Response>> {
  const headers: Record<string, string> = {};
  if (authenticated) {
    const actor = Deno.env.get("GITHUB_ACTOR");
    const token = Deno.env.get("GH_TOKEN") || Deno.env.get("GITHUB_TOKEN");
    assert(actor && token, "Registry authentication required");
    headers.Authorization = `Basic ${btoa(`${actor}:${token}`)}`;
  }
  const auth = await fetch(`https://ghcr.io/token?service=ghcr.io&scope=repository:${name}:pull`, {
    headers,
  });
  assert(
    auth.ok,
    `GHCR authentication failed (${auth.status}); verify package visibility and repository access`,
  );
  const { token } = await auth.json();
  assert(typeof token === "string", "GHCR returned no pull token");
  return (path) =>
    fetch(`https://ghcr.io/v2/${name}/${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.oci.image.manifest.v1+json",
      },
    });
}
async function manifest(
  name: string,
  version: string,
  authenticated = true,
): Promise<
  { digest: string; layers: { digest: string }[]; pull: (path: string) => Promise<Response> }
> {
  const pull = await registry(name, authenticated);
  const response = await pull(`manifests/${version}`);
  assert(
    response.ok,
    `Cannot fetch ${name}:${version} (${response.status}); public visibility may require maintainer configuration`,
  );
  const bytes = await response.arrayBuffer();
  const digest = `sha256:${
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) =>
      b.toString(16).padStart(2, "0")
    ).join("")
  }`;
  assert(response.headers.get("docker-content-digest") === digest, "OCI manifest digest mismatch");
  const value = JSON.parse(decoder.decode(bytes));
  assert(
    Array.isArray(value.layers) && value.layers.length === 1,
    "Unexpected template OCI layers",
  );
  return { digest, layers: value.layers, pull };
}
async function files(root: string, prefix = ""): Promise<string[]> {
  const paths: string[] = [];
  for await (const file of Deno.readDir(root)) {
    assert(!file.isSymlink, "Template archive contains a symbolic link");
    if (file.isDirectory) {
      paths.push(...await files(`${root}/${file.name}`, `${prefix}${file.name}/`));
    } else {
      assert(file.isFile, "Template archive contains a non-regular file");
      paths.push(`${prefix}${file.name}`);
    }
  }
  return paths.sort();
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) =>
        `${JSON.stringify(k)}:${canonical(v)}`
      ).join(",")
    }}`;
  }
  return JSON.stringify(value);
}
export async function sourceMatches(
  item: Metadata,
  remote: Awaited<ReturnType<typeof manifest>>,
): Promise<void> {
  const temp = await Deno.makeTempDir({ prefix: "template-release-" });
  try {
    const response = await remote.pull(`blobs/${remote.layers[0].digest}`);
    assert(response.ok, `Cannot download published template ${item.id}`);
    const archive = `${temp}/template.tgz`;
    const bytes = await response.arrayBuffer();
    const digest = `sha256:${
      Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) =>
        b.toString(16).padStart(2, "0")
      ).join("")
    }`;
    assert(digest === remote.layers[0].digest, "Template layer digest mismatch");
    await Deno.writeFile(archive, new Uint8Array(bytes));
    const entries = (await command(["tar", "-tzf", archive])).split("\n");
    assert(
      entries.every((p) => !p.startsWith("/") && !p.split("/").includes("..")),
      "Unsafe template archive paths",
    );
    assert(
      (await command(["tar", "-tvzf", archive])).split("\n").every((p) => /^[d-]/.test(p)),
      "Template archive contains links or devices",
    );
    const extracted = `${temp}/extracted`;
    await Deno.mkdir(extracted);
    await command([
      "tar",
      "-xzf",
      archive,
      "--no-same-owner",
      "--no-same-permissions",
      "-C",
      extracted,
    ]);
    const source = `src/${item.id}`;
    const sourceFiles = await files(source);
    const remoteFiles = await files(extracted);
    assert(
      canonical(sourceFiles) === canonical(remoteFiles),
      `Published ${item.id}:${item.version} has different files. Use a higher repair version.`,
    );
    const metadata = JSON.parse(await Deno.readTextFile(`${extracted}/devcontainer-template.json`));
    for (const derived of ["type", "files", "fileCount", "featureIds"]) delete metadata[derived];
    const normalized = structuredClone(item);
    if (Array.isArray(normalized.optionalPaths)) {
      normalized.optionalPaths = normalized.optionalPaths.map((p: string) => {
        if (!p.endsWith("/*")) return p;
        const matching = sourceFiles.filter((file) => file.startsWith(p.slice(0, -2)));
        return matching.length === 1 ? matching[0] : p;
      });
    }
    assert(
      canonical(normalized) === canonical(metadata),
      `Published metadata differs from ${item.id}:${item.version}; use a higher repair version`,
    );
    for (const file of sourceFiles.filter((p) => p !== "devcontainer-template.json")) {
      const expected = await Deno.readFile(`${source}/${file}`);
      const actual = await Deno.readFile(`${extracted}/${file}`);
      assert(
        expected.length === actual.length && expected.every((b, index) => actual[index] === b),
        `Published content differs: ${item.id}/${file}; use a higher repair version`,
      );
    }
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
}
async function sourceTag(tag: string): Promise<string | undefined> {
  // ls-remote distinguishes absent tags (empty successful output) from access failures.
  const text = await command(["git", "ls-remote", "--tags", "origin", `refs/tags/${tag}`]);
  return text ? text.split(/\s/)[0] : undefined;
}
async function verifyProvenance(item: ReleaseItem, repository: string): Promise<void> {
  await command([
    "gh",
    "attestation",
    "verify",
    `oci://${item.name}@${item.digest}`,
    "--repo",
    repository,
    "--signer-workflow",
    `${repository}/.github/workflows/release.yml`,
    "--source-digest",
    item.source,
    "--deny-self-hosted-runners",
  ]);
}
async function prepare(): Promise<void> {
  const { repository, sha } = await guard();
  const eventPath = Deno.env.get("GITHUB_EVENT_PATH");
  assert(eventPath, "Push event payload required for release validation");
  const before = JSON.parse(await Deno.readTextFile(eventPath)).before;
  assert(
    typeof before === "string" && /^[a-f0-9]{40}$/.test(before) && !/^0+$/.test(before),
    "A valid existing push base SHA is required",
  );
  await command(["git", "cat-file", "-e", `${before}^{commit}`]);
  await command(["git", "merge-base", "--is-ancestor", before, sha]);
  const metadata = await validate(Deno.cwd(), before);
  // Preflight every existing source tag before any irreversible registry write.
  const existingTags = new Map<string, string>();
  const verifiedDigests = new Map<string, string>();
  for (const item of metadata) {
    const tag = `${item.id}/v${item.version}`;
    const existing = await sourceTag(tag);
    if (!existing) continue;
    await command(["git", "fetch", "--no-tags", "origin", existing]);
    const changed = await command([
      "git",
      "diff",
      "--name-only",
      existing,
      sha,
      "--",
      `src/${item.id}`,
    ]);
    assert(
      !changed,
      `${tag} is already released with different template source; increment its version`,
    );
    const remote = await manifest(`${repository}/${item.id}`, item.version);
    await sourceMatches(item, remote);
    await verifyProvenance({
      id: item.id,
      version: item.version,
      name: `ghcr.io/${repository}/${item.id}`,
      digest: remote.digest,
      source: existing,
    }, repository);
    verifiedDigests.set(item.id, remote.digest);
    existingTags.set(item.id, existing);
  }
  const text = await command([
    "devcontainer",
    "templates",
    "publish",
    "./src",
    "--registry",
    "ghcr.io",
    "--namespace",
    repository,
  ]);
  const result = publishResult(text, metadata);
  const pending: ReleaseItem[] = [];
  for (const item of metadata) {
    const existing = existingTags.get(item.id);
    const name = `${repository}/${item.id}`;
    const remote = await manifest(name, item.version);
    if (result[item.id].digest) {
      assert(result[item.id].digest === remote.digest, "CLI and registry digest disagree");
    }
    if (existing) {
      assert(
        remote.digest === verifiedDigests.get(item.id),
        "Existing published manifest changed after source and provenance verification",
      );
      continue;
    }
    await sourceMatches(item, remote);
    pending.push({
      id: item.id,
      version: item.version,
      name: `ghcr.io/${name}`,
      digest: remote.digest,
      source: sha,
    });
  }
  await emit("matrix", JSON.stringify(pending));
  await emit("pending", String(pending.length > 0));
}
async function provenance(item: ReleaseItem): Promise<void> {
  const { repository, sha } = await guard();
  assert(item.source === sha, "Attestation source differs from checked out commit");
  const response = await fetch(
    `https://api.github.com/repos/${repository}/attestations/${item.digest}?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${Deno.env.get("GH_TOKEN")}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  // This endpoint reports 404 when the digest has no attestation records.
  assert(response.ok || response.status === 404, `Attestation lookup failed (${response.status})`);
  const records: { attestations: unknown[] } = response.status === 404
    ? { attestations: [] }
    : await response.json();
  if (!records.attestations.length) {
    await emit("needed", "true");
    return;
  }
  await verifyProvenance(item, repository);
  await emit("needed", "false");
}
async function tag(item: ReleaseItem): Promise<void> {
  const { repository, sha } = await guard();
  assert(
    item.source === sha && item.name === `ghcr.io/${repository}/${item.id}` &&
      /^[a-z0-9-]+$/.test(item.id) && validateStrict(item.version),
    "Invalid release item",
  );
  const current = await manifest(`${repository}/${item.id}`, item.version);
  assert(current.digest === item.digest, "Published manifest changed before tagging");
  await verifyProvenance(item, repository);
  const name = `${item.id}/v${item.version}`;
  const existing = await sourceTag(name);
  if (existing) {
    assert(existing === sha, "Version tag already references another commit");
    return;
  }
  await gh("/git/refs", "POST", { ref: `refs/tags/${name}`, sha });
  assert(await sourceTag(name) === sha, "Source tag readback mismatch");
}
async function publicVerify(): Promise<void> {
  const { repository } = await guard();
  const metadata = await validate(Deno.cwd());
  const temp = await Deno.makeTempDir({ prefix: "public-template-" });
  try {
    await Deno.mkdir(`${temp}/docker`);
    await Deno.writeTextFile(`${temp}/docker/config.json`, "{}\n");
    for (const item of metadata) {
      // Token exchange deliberately has no Authorization header.
      const remote = await manifest(`${repository}/${item.id}`, item.version, false);
      await sourceMatches(item, remote);
      const workspace = `${temp}/${item.id}`;
      await Deno.mkdir(workspace);
      await command(
        [
          "devcontainer",
          "templates",
          "apply",
          "--workspace-folder",
          workspace,
          "--template-id",
          `ghcr.io/${repository}/${item.id}@${remote.digest}`,
        ],
        false,
        {
          DOCKER_CONFIG: `${temp}/docker`,
          DEVCONTAINERS_OCI_AUTH: "",
          GITHUB_TOKEN: "",
          GH_TOKEN: "",
        },
      );
      assert(
        (await files(workspace)).some((p) =>
          p.endsWith("devcontainer.json") || p === ".devcontainer.json"
        ),
        "Anonymous apply returned no container configuration",
      );
    }
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
}
export async function release(args: string[]): Promise<void> {
  const [phase, encoded] = args;
  if (phase === "prepare") await prepare();
  else if (phase === "public-verify") await publicVerify();
  else {
    assert(encoded, "Release item JSON required");
    const item = JSON.parse(encoded) as ReleaseItem;
    if (phase === "provenance") await provenance(item);
    else if (phase === "tag") await tag(item);
    else throw new Error("release prepare|provenance ITEM|tag ITEM|public-verify");
  }
}
if (import.meta.main) await release(Deno.args);
