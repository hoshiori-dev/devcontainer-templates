#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net=api.github.com --allow-env=GH_TOKEN,GITHUB_TOKEN,GITHUB_REPOSITORY,GITHUB_EVENT_PATH,GITHUB_OUTPUT,GITHUB_RUN_ID,NEEDS
/** Repository-owned GitHub policy commands. Privileged callers use default-branch code. */
export type FileContent = { path: string; content: string };
type Json = Record<string, unknown>;
const encoder = new TextEncoder();
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function packagePath(
  path: string,
): { name: string; relative: string; archived: boolean } | undefined {
  const parts = path.split("/");
  if (parts[0] !== "openspec" || parts[1] !== "changes") return;
  const archived = parts[2] === "archive";
  const offset = archived ? 4 : 3;
  const name = archived ? parts[3]?.replace(/^\d{4}-\d{2}-\d{2}-/, "") : parts[2];
  if (!name || !parts[offset]) return;
  return { name, relative: parts.slice(offset).join("/"), archived };
}
export async function packageDigest(files: FileContent[]): Promise<string> {
  const normalized = files.flatMap((file) => {
    const p = packagePath(file.path);
    if (
      !p ||
      !(p.relative === "proposal.md" || p.relative === "design.md" ||
        p.relative.startsWith("specs/"))
    ) return [];
    return [[`${p.name}/${p.relative}`, file.content]];
  }).sort((a, b) => a[0].localeCompare(b[0]));
  assert(normalized.length, "Approval package has no proposal or specifications");
  const paths = normalized.map(([path]) => path);
  assert(new Set(paths).size === paths.length, "Active and archived approval packages overlap");
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify(normalized))),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function checkGate(
  needs: Record<string, { result: string }>,
  optional: string[] = [],
): void {
  for (const [name, job] of Object.entries(needs)) {
    assert(
      job.result === "success" || (job.result === "skipped" && optional.includes(name)),
      `${name}: ${job.result}`,
    );
  }
}
export function checkArchive(files: FileContent[], draft: boolean): void {
  const archived = new Set(
    files.map((f) => packagePath(f.path)).filter((p) => p?.archived).map((p) => p!.name),
  );
  for (const name of archived) {
    const tasks = files.find((f) =>
      packagePath(f.path)?.name === name && packagePath(f.path)?.relative === "tasks.md"
    );
    assert(
      tasks && /- \[x\]/i.test(tasks.content) && !/- \[ \]/.test(tasks.content),
      `Archived ${name} must contain completed tasks`,
    );
  }
  const active = files.filter((f) => packagePath(f.path) && !packagePath(f.path)!.archived);
  if (active.length && draft) console.log("Draft: archive gate pending human confirmation.");
  else {assert(
      !active.length,
      "Specification is active. Wait for human confirmation and archive in this PR before merging.",
    );}
}
export function metadataBehaviorChanged(before: string, after: string): boolean {
  const descriptive = new Set([
    "version",
    "name",
    "description",
    "documentationURL",
    "licenseURL",
    "publisher",
    "keywords",
  ]);
  function normalize(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map((
          [key, item],
        ) => [key, normalize(item)]),
      );
    }
    return value;
  }
  function behavior(text: string): string {
    const metadata = JSON.parse(text);
    assert(
      metadata && typeof metadata === "object" && !Array.isArray(metadata),
      "Metadata must be a JSON object",
    );
    return JSON.stringify(
      normalize(
        Object.fromEntries(Object.entries(metadata).filter(([key]) => !descriptive.has(key))),
      ),
    );
  }
  return behavior(before) !== behavior(after);
}
type Requirement = { mode: string; body: string };
function requirements(text: string): Map<string, Requirement> {
  const result = new Map<string, Requirement>();
  let mode = "";
  let name = "";
  let body: string[] = [];
  let fence = "";
  function flush(): void {
    if (!name) return;
    assert(!result.has(name), `Duplicate requirement: ${name}`);
    result.set(name, { mode, body: body.join("\n").replace(/\s+/g, " ").trim() });
    name = "";
    body = [];
  }
  for (const line of text.split("\n")) {
    const fenced = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenced) {
      if (!fence) fence = fenced[1];
      else if (fenced[1][0] === fence[0] && fenced[1].length >= fence.length) fence = "";
    }
    if (!fence && /^## /.test(line)) {
      flush();
      mode = /^## (ADDED|MODIFIED|REMOVED) Requirements\s*$/.exec(line)?.[1] || "";
    } else if (!fence && line.startsWith("### Requirement: ")) {
      flush();
      name = line.slice("### Requirement: ".length).trim();
    } else if (name) body.push(line);
  }
  flush();
  return result;
}
function renames(delta: string): [string, string][] {
  const section = /^## RENAMED Requirements\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(delta)?.[1] ||
    "";
  const result: [string, string][] = [];
  let from = "";
  for (const line of section.split("\n")) {
    const old = /^- FROM: `### Requirement: (.+)`\s*$/.exec(line);
    const next = /^- TO: `### Requirement: (.+)`\s*$/.exec(line);
    if (old) from = old[1];
    if (next) {
      assert(from, "Rename is missing FROM");
      result.push([from, next[1]]);
      from = "";
    }
  }
  assert(!from, "Rename is missing TO");
  return result;
}
export function stableDeltaMatches(delta: string, stable: string, before?: string): boolean {
  const actual = requirements(stable);
  const previous = requirements(before || "");
  for (const [name, requirement] of requirements(delta)) {
    if (["ADDED", "MODIFIED"].includes(requirement.mode)) {
      if (actual.get(name)?.body !== requirement.body) return false;
    } else if (requirement.mode === "REMOVED") {
      if (actual.has(name)) return false;
    } else return false;
  }
  for (const [from, to] of renames(delta)) {
    if (actual.has(from) || !actual.has(to)) return false;
    if (before !== undefined && (!previous.has(from) || previous.has(to))) return false;
    if (
      before !== undefined && !requirements(delta).has(to) &&
      actual.get(to)?.body !== previous.get(from)?.body
    ) return false;
  }
  return true;
}
export function stableChangesCovered(deltas: string[], before: string, after: string): boolean {
  const old = requirements(before);
  const current = requirements(after);
  const declared = new Map<string, Requirement>();
  for (const delta of deltas) {
    if (!stableDeltaMatches(delta, after, before)) return false;
    for (const [name, operation] of requirements(delta)) {
      if (declared.has(name)) return false;
      declared.set(name, operation);
    }
    for (const [from, to] of renames(delta)) {
      declared.set(from, { mode: "REMOVED", body: "" });
      declared.set(to, { mode: "ADDED", body: current.get(to)!.body });
    }
  }
  for (const name of new Set([...old.keys(), ...current.keys()])) {
    if (old.get(name)?.body === current.get(name)?.body) continue;
    const expected = !old.has(name) ? "ADDED" : !current.has(name) ? "REMOVED" : "MODIFIED";
    if (declared.get(name)?.mode !== expected) return false;
  }
  return true;
}
export function approvalActor(
  actor: { type?: string; login?: string },
  permission: string,
): boolean {
  return actor.type === "User" && !!actor.login && ["admin", "maintain"].includes(permission);
}
export function publishResult(
  text: string,
  metadata: { id: string; version: string }[],
): Record<string, { digest?: string; version?: string; publishedTags?: string[] }> {
  const result = JSON.parse(text);
  assert(
    result && typeof result === "object" && !Array.isArray(result),
    "Malformed CLI publish output",
  );
  assert(Object.keys(result).length === metadata.length, "Publish output omits templates");
  for (const m of metadata) {
    const entry = result[m.id];
    assert(
      entry && typeof entry === "object" && !Array.isArray(entry),
      `Missing publish output: ${m.id}`,
    );
    if (Object.keys(entry).length) {
      assert(/^sha256:[a-f0-9]{64}$/.test(entry.digest), `Invalid published digest: ${m.id}`);
      assert(
        entry.version === m.version && Array.isArray(entry.publishedTags) &&
          entry.publishedTags.includes(m.version),
        `Version not published: ${m.id}`,
      );
    }
  }
  return result;
}
const repo = () => {
  const value = Deno.env.get("GITHUB_REPOSITORY");
  assert(value && /^[\w.-]+\/[\w.-]+$/.test(value), "GITHUB_REPOSITORY is required");
  return value;
};
async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; allow404?: boolean } = {},
): Promise<T> {
  const token = Deno.env.get("GH_TOKEN") || Deno.env.get("GITHUB_TOKEN");
  assert(token, "GH_TOKEN or GITHUB_TOKEN required");
  const response = await fetch(`https://api.github.com/repos/${repo()}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (options.allow404 && response.status === 404) return undefined as T;
  assert(response.ok, `GitHub ${options.method || "GET"} ${path}: ${response.status}`);
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}
async function pages<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1;; page++) {
    const batch = await api<T[]>(
      `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
    );
    all.push(...batch);
    if (batch.length < 100) return all;
    assert(page < 100, "API result exceeds safe pagination limit");
  }
}
interface PullRequest {
  number: number;
  draft: boolean;
  title: string;
  body: string | null;
  base: { sha: string; ref: string };
  head: { sha: string };
  labels: { name: string }[];
}
async function event(): Promise<Json> {
  const path = Deno.env.get("GITHUB_EVENT_PATH");
  assert(path, "GITHUB_EVENT_PATH required");
  const payload = JSON.parse(await Deno.readTextFile(path));
  if (payload.workflow_run) {
    const run = payload.workflow_run;
    assert(
      run.path === ".github/workflows/spec-approval.yml" && run.event === "pull_request_target",
      "Unexpected policy completion event",
    );
    const match = /^Specification approval #(\d+)$/.exec(run.display_title);
    assert(match, "Approval run does not identify its pull request");
    payload.pull_request = { number: Number(match[1]) };
  }
  return payload;
}
async function snapshot(): Promise<
  { pr: PullRequest; files: FileContent[]; requiresSpec: boolean; digest?: string }
> {
  const payload = await event();
  const number = (payload.pull_request as PullRequest | undefined)?.number || payload.number;
  assert(typeof number === "number", "Pull request event required");
  const pr = await api<PullRequest>(`/pulls/${number}`);
  assert(pr.base.ref === "main", "Pull requests must target main");
  const changed = await pages<{ filename: string; previous_filename?: string }>(
    `/pulls/${number}/files`,
  );
  // GitHub truncates this API at 3,000 files. Never accept an incomplete policy input.
  assert(changed.length < 3000, "PR is too large for reliable policy validation");
  const names = new Set(
    changed.flatMap((f) => [f.filename, f.previous_filename || ""]).map(packagePath).filter((p) =>
      p !== undefined
    ).map((p) => p!.name),
  );
  let requiresSpec = changed.some((f) =>
    /^src\/[^/]+\//.test(f.filename) && !/\/(README|NOTES)\.md$/.test(f.filename) &&
    !f.filename.endsWith("/devcontainer-template.json")
  );
  const tree = await api<
    { tree: { path: string; sha: string; type: string }[]; truncated: boolean }
  >(`/git/trees/${pr.head.sha}?recursive=1`);
  assert(!tree.truncated, "PR tree was truncated");
  for (
    const change of changed.filter((f) =>
      /^src\/[^/]+\/devcontainer-template\.json$/.test(f.filename)
    )
  ) {
    const current = tree.tree.find((entry) =>
      entry.path === change.filename && entry.type === "blob"
    );
    const previous = await api<{ content: string; encoding: string; size: number }>(
      `/contents/${change.filename}?ref=${pr.base.sha}`,
      { allow404: true },
    );
    if (!current || !previous) {
      requiresSpec = true;
      continue;
    }
    const blob = await api<{ content: string; encoding: string; size: number }>(
      `/git/blobs/${current.sha}`,
    );
    assert(
      previous.encoding === "base64" && blob.encoding === "base64" && previous.size < 1_000_000 &&
        blob.size < 1_000_000,
      "Metadata too large or unsupported",
    );
    const decode = (value: string) =>
      new TextDecoder().decode(
        Uint8Array.from(atob(value.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
      );
    if (metadataBehaviorChanged(decode(previous.content), decode(blob.content))) {
      requiresSpec = true;
    }
  }
  const files: FileContent[] = [];
  for (const file of tree.tree) {
    const p = packagePath(file.path);
    if (p && names.has(p.name) && file.type === "blob") {
      const blob = await api<{ content: string; encoding: string; size: number }>(
        `/git/blobs/${file.sha}`,
      );
      assert(
        blob.encoding === "base64" && blob.size < 1_000_000,
        "Approval document is too large or unsupported",
      );
      files.push({
        path: file.path,
        content: new TextDecoder().decode(
          Uint8Array.from(atob(blob.content.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
        ),
      });
    }
  }
  if (requiresSpec) {
    assert(
      names.size && files.some((f) => packagePath(f.path)?.relative === "proposal.md"),
      "Template behavior changes require an OpenSpec proposal and specification delta",
    );
  }
  for (const change of changed.filter((f) => f.filename.startsWith("openspec/specs/"))) {
    const relative = change.filename.slice("openspec/".length);
    assert(
      files.some((f) =>
        packagePath(f.path)?.archived && packagePath(f.path)?.relative === relative
      ),
      `Stable specification edit needs a matching archived delta: ${change.filename}`,
    );
  }
  const archivedSpecs = files.filter((file) =>
    packagePath(file.path)?.archived && packagePath(file.path)?.relative.startsWith("specs/")
  );
  for (const relative of new Set(archivedSpecs.map((file) => packagePath(file.path)!.relative))) {
    const stablePath = `openspec/${relative}`;
    const stableEntry = tree.tree.find((entry) =>
      entry.path === stablePath && entry.type === "blob"
    );
    const readSpec = (
      blob: { content: string; encoding: string; size: number } | undefined,
    ): string => {
      if (!blob) return "";
      assert(
        blob.encoding === "base64" && blob.size < 1_000_000,
        "Stable specification is too large or unsupported",
      );
      return new TextDecoder().decode(
        Uint8Array.from(atob(blob.content.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
      );
    };
    const content = readSpec(
      stableEntry ? await api(`/git/blobs/${stableEntry.sha}`) : undefined,
    );
    const previous = readSpec(
      await api(`/contents/${stablePath}?ref=${pr.base.sha}`, { allow404: true }),
    );
    const deltas = archivedSpecs.filter((file) => packagePath(file.path)?.relative === relative)
      .map((file) => file.content);
    assert(
      stableChangesCovered(deltas, previous, content),
      `Archived deltas do not cover the exact requirement changes in ${stablePath}`,
    );
  }
  for (const name of names) {
    assert(
      files.some((f) =>
        packagePath(f.path)?.name === name && packagePath(f.path)?.relative === "proposal.md"
      ),
      `Missing proposal for ${name}`,
    );
    assert(
      files.some((f) =>
        packagePath(f.path)?.name === name && packagePath(f.path)?.relative.startsWith("specs/")
      ),
      `Missing specification delta for ${name}`,
    );
  }
  return { pr, files, requiresSpec, digest: files.length ? await packageDigest(files) : undefined };
}
async function human(login: string): Promise<boolean> {
  const result = await api<{
    permission: string;
    role_name?: string;
    user: { login: string; type: string; permissions?: { admin?: boolean; maintain?: boolean } };
  }>(`/collaborators/${encodeURIComponent(login)}/permission`);
  const role = result.user.permissions?.admin || result.permission === "admin"
    ? "admin"
    : result.user.permissions?.maintain || result.role_name === "maintain"
    ? "maintain"
    : result.permission;
  return result.user.login === login && approvalActor(result.user, role);
}
export function trustedApprovalRun(
  run: {
    workflow_id: number;
    path: string;
    event: string;
    conclusion: string;
    repository: { id: number };
  },
  workflowId: number,
  repositoryId: number,
): boolean {
  return run.workflow_id === workflowId && run.path === ".github/workflows/spec-approval.yml" &&
    run.event === "pull_request_target" && run.conclusion === "success" &&
    run.repository.id === repositoryId;
}
async function validApproval(number: number, digest: string): Promise<boolean> {
  const name = `spec-approval-${number}-${digest}`;
  const workflow = await api<{ id: number }>("/actions/workflows/spec-approval.yml", {
    allow404: true,
  });
  if (!workflow) return false;
  const artifacts = await api<
    { artifacts: { name: string; expired: boolean; workflow_run?: { id: number } }[] }
  >(`/actions/artifacts?name=${name}&per_page=100`);
  const repository = await api<{ id: number; default_branch: string }>("");
  for (const artifact of artifacts.artifacts) {
    if (artifact.name !== name || artifact.expired || !artifact.workflow_run) continue;
    const run = await api<
      {
        workflow_id: number;
        path: string;
        event: string;
        conclusion: string;
        actor: { login: string };
        head_sha: string;
        repository: { id: number };
      }
    >(`/actions/runs/${artifact.workflow_run.id}`);
    if (!trustedApprovalRun(run, workflow.id, repository.id)) continue;
    if (!await human(run.actor.login)) continue;
    // A trusted approval run must have run on a commit reachable from the default branch.
    const comparison = await api<{ status: string }>(
      `/compare/${run.head_sha}...${encodeURIComponent(repository.default_branch)}`,
    );
    if (["ahead", "identical"].includes(comparison.status)) return true;
  }
  return false;
}
async function stable(pr: PullRequest): Promise<void> {
  const current = await api<PullRequest>(`/pulls/${pr.number}`);
  assert(
    current.head.sha === pr.head.sha && current.base.sha === pr.base.sha,
    "PR changed while policy was running; rerun on the new snapshot",
  );
}
async function output(name: string, value: string): Promise<void> {
  const path = Deno.env.get("GITHUB_OUTPUT");
  if (path) await Deno.writeTextFile(path, `${name}=${value}\n`, { append: true });
  else console.log(`${name}=${value}`);
}
async function specCheck(archive: boolean): Promise<void> {
  const s = await snapshot();
  if (archive) checkArchive(s.files, s.pr.draft);
  else if (s.digest) {
    assert(
      s.pr.labels.some((l) => l.name === "spec:approved"),
      "Maintainer specification approval is pending",
    );
    const verified = await validApproval(s.pr.number, s.digest);
    assert(
      verified,
      "No valid immutable human approval record matches this package. Reapply spec:approved after reviewing the current proposal.",
    );
  }
  await stable(s.pr);
}
async function approval(): Promise<void> {
  const payload = await event();
  const s = await snapshot();
  if (!s.pr.labels.some((l) => l.name === "spec:approved")) return;
  const sender = payload.sender as { login: string; type: string };
  const approving = payload.action === "labeled" &&
    (payload.label as { name: string })?.name === "spec:approved";
  const authorized = approving && sender.type === "User" && await human(sender.login);
  const existing = !!s.digest && await validApproval(s.pr.number, s.digest);
  await stable(s.pr);
  if (!s.digest || (!authorized && !existing)) {
    await api(`/issues/${s.pr.number}/labels/spec%3Aapproved`, {
      method: "DELETE",
      allow404: true,
    });
    console.log("Removed unverified or outdated spec:approved label.");
    return;
  }
  if (!authorized) return;
  const record = {
    repository: repo(),
    pull_request: s.pr.number,
    actor: sender.login,
    approved_head: s.pr.head.sha,
    trusted_base: s.pr.base.sha,
    digest: s.digest,
    created_at: new Date().toISOString(),
  };
  await Deno.writeTextFile("approval.json", JSON.stringify(record, null, 2) + "\n");
  await output("artifact", `spec-approval-${s.pr.number}-${s.digest}`);
  await output("approved", "true");
  console.log(
    `Approved package ${s.digest} by ${sender.login}; immutable record will be uploaded by this workflow.`,
  );
}
export const labels = [
  { name: "type:bug", color: "d73a4a", description: "A defect in an existing template or tool" },
  {
    name: "type:template",
    color: "0075ca",
    description: "A new or changed dev container template",
  },
  { name: "type:task", color: "cfd3d7", description: "Engineering or documentation work" },
  {
    name: "area:templates",
    color: "1d76db",
    description: "Published templates and template tests",
  },
  {
    name: "area:harness",
    color: "5319e7",
    description: "Project tooling, CI, and agent instructions",
  },
  { name: "area:docs", color: "0e8a16", description: "Documentation and translations" },
  {
    name: "spec:approved",
    color: "bfdadc",
    description: "Human specification approval; immutable evidence required",
  },
];
async function syncLabels(apply: boolean): Promise<void> {
  const existing = await pages<{ name: string; color: string; description: string | null }>(
    "/labels",
  );
  for (const label of labels) {
    const previous = existing.find((l) => l.name === label.name);
    if (previous?.color === label.color && previous.description === label.description) continue;
    console.log(JSON.stringify({ action: previous ? "update" : "create", ...label }));
    if (apply) {
      await api(previous ? `/labels/${encodeURIComponent(label.name)}` : "/labels", {
        method: previous ? "PATCH" : "POST",
        body: label,
      });
    }
  }
  if (apply) {
    const actual = await pages<{ name: string; color: string; description: string | null }>(
      "/labels",
    );
    assert(
      labels.every((l) =>
        actual.some((a) =>
          a.name === l.name && a.color === l.color && a.description === l.description
        )
      ),
      "Label readback does not match requested configuration",
    );
  }
}
async function prCheck(): Promise<void> {
  const payload = await event();
  const eventPr = payload.pull_request as PullRequest;
  assert(eventPr?.number, "Pull request context required");
  const pr = await api<PullRequest>(`/pulls/${eventPr.number}`);
  assert(pr && pr.base.ref === "main", "PR must target main");
  assert(
    pr.title.length <= 50 && /^[a-z]/.test(pr.title) && !pr.title.endsWith("."),
    "PR title becomes squash title: lowercase, <=50 characters, no trailing period",
  );
  const body = pr.body || "";
  for (const heading of ["## Problem", "## Changes", "## Validation", "## Specification"]) {
    assert(body.includes(heading), `PR description missing ${heading}`);
  }
  assert(!/\b(?:TODO|TBD)\b/.test(body), "Complete PR description placeholders before review");
}
async function protectedPolicy(): Promise<void> {
  const payload = await event();
  const number = (payload.pull_request as PullRequest | undefined)?.number;
  assert(number, "Policy requires a pull request context");
  const pr = await api<PullRequest>(`/pulls/${number}`);
  let failed = false;
  for (
    const [name, check] of [
      ["protected-policy", async () => {
        await prCheck();
        await specCheck(false);
      }],
      ["spec-archived", async () => {
        await specCheck(true);
      }],
    ] as const
  ) {
    let summary = "Trusted base policy passed.";
    let conclusion = "success";
    try {
      await check();
    } catch (error) {
      summary = String(error);
      conclusion = "failure";
      failed = true;
    }
    await stable(pr);
    await api("/check-runs", {
      method: "POST",
      body: {
        name,
        head_sha: pr.head.sha,
        status: "completed",
        conclusion,
        details_url: `https://github.com/${repo()}/actions/runs/${Deno.env.get("GITHUB_RUN_ID")}`,
        output: { title: name, summary },
      },
    });
    console.log(`${name}: ${conclusion}: ${summary}`);
  }
  assert(!failed, "Trusted policy checks rejected this PR");
}
async function platformCheck(): Promise<void> {
  for (
    const path of [
      "",
      "/rulesets",
      "/branches/main/protection",
      "/actions/permissions",
      "/actions/permissions/workflow",
      "/code-scanning/default-setup",
      "/vulnerability-alerts",
    ]
  ) {
    try {
      console.log(JSON.stringify({ path, result: await api(path) }));
    } catch (error) {
      console.log(JSON.stringify({ path, unavailable: String(error) }));
    }
  }
}

async function main(): Promise<void> {
  const [command, ...args] = Deno.args;
  switch (command) {
    case "protected-policy":
      await protectedPolicy();
      break;
    case "pr-check":
      await prCheck();
      break;
    case "spec-check":
      await specCheck(args.includes("--archive"));
      break;
    case "approval":
      await approval();
      break;
    case "labels":
      await syncLabels(args.includes("--apply"));
      break;
    case "platform-check":
      await platformCheck();
      break;
    case "gate":
      checkGate(JSON.parse(Deno.env.get("NEEDS") || "{}"), ["containers", "devcontainer"]);
      break;
    default:
      throw new Error(
        "Usage: github.ts pr-check|spec-check [--archive]|approval|labels [--apply]|platform-check|gate",
      );
  }
}
if (import.meta.main) await main();
