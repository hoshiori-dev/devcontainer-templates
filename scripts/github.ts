#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net=api.github.com --allow-env=GH_TOKEN,GITHUB_TOKEN,GITHUB_REPOSITORY,GITHUB_EVENT_PATH,GITHUB_OUTPUT,GITHUB_RUN_ID
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
export function checkArchive(files: FileContent[], target: string): void {
  if (target !== "main") return;
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
  assert(
    !active.length,
    "Specification is active. Wait for human confirmation and archive before merging into main.",
  );
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
  base: { sha: string; ref: string };
  head: { sha: string };
  labels: { name: string }[];
}
async function event(): Promise<Json> {
  const path = Deno.env.get("GITHUB_EVENT_PATH");
  assert(path, "GITHUB_EVENT_PATH required");
  const payload = JSON.parse(await Deno.readTextFile(path));
  return payload;
}
async function snapshot(): Promise<
  { pr: PullRequest; files: FileContent[] }
> {
  const payload = await event();
  const number = (payload.pull_request as PullRequest | undefined)?.number || payload.number;
  assert(typeof number === "number", "Pull request event required");
  const pr = await api<PullRequest>(`/pulls/${number}`);
  const changed = await pages<{ filename: string; previous_filename?: string }>(
    `/pulls/${number}/files`,
  );
  // GitHub truncates this API at 3,000 files. Never accept an incomplete policy input.
  assert(changed.length < 3000, "PR is too large for reliable policy validation");
  const paths = changed.flatMap((file) =>
    file.previous_filename ? [file.filename, file.previous_filename] : [file.filename]
  );
  const names = new Set(
    paths.map(packagePath).filter((p) => p !== undefined).map((p) => p!.name),
  );
  const tree = await api<
    { tree: { path: string; sha: string; type: string }[]; truncated: boolean }
  >(`/git/trees/${pr.head.sha}?recursive=1`);
  assert(!tree.truncated, "PR tree was truncated");
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
  return { pr, files };
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
  const trustedWorkflow = await api<{ sha: string }>(
    `/contents/.github/workflows/spec-approval.yml?ref=${
      encodeURIComponent(repository.default_branch)
    }`,
  );
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
    // REST run.head_sha can identify the PR head, not the checked-out default branch.
    // Only accept the same workflow definition as the trusted default branch.
    const sourceWorkflow = await api<{ sha: string }>(
      `/contents/.github/workflows/spec-approval.yml?ref=${run.head_sha}`,
      { allow404: true },
    );
    if (sourceWorkflow?.sha === trustedWorkflow.sha) return true;
  }
  return false;
}
async function output(name: string, value: string): Promise<void> {
  const path = Deno.env.get("GITHUB_OUTPUT");
  if (path) await Deno.writeTextFile(path, `${name}=${value}\n`, { append: true });
  else console.log(`${name}=${value}`);
}
export function checkApprovalHead(eventHead: string | undefined, currentHead: string): void {
  assert(
    eventHead && eventHead === currentHead,
    "PR changed after the approval label event. Review the current commit and reapply spec:approved.",
  );
}
export async function approval(): Promise<void> {
  const payload = await event();
  const s = await snapshot();
  if (!s.pr.labels.some((l) => l.name === "spec:approved")) return;
  const sender = payload.sender as { login: string; type: string };
  const approving = payload.action === "labeled" &&
    (payload.label as { name: string })?.name === "spec:approved";
  const authorized = approving && sender.type === "User" && await human(sender.login);
  if (authorized) {
    checkApprovalHead((payload.pull_request as PullRequest | undefined)?.head.sha, s.pr.head.sha);
  }
  const hasPackage = s.files.some((file) => {
    const relative = packagePath(file.path)?.relative;
    return relative === "proposal.md" || relative === "design.md" || relative?.startsWith("specs/");
  });
  const digest = hasPackage ? await packageDigest(s.files) : undefined;
  const existing = !!digest && await validApproval(s.pr.number, digest);
  if (!digest || (!authorized && !existing)) {
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
    base_sha: s.pr.base.sha,
    digest,
    created_at: new Date().toISOString(),
  };
  await Deno.writeTextFile("approval.json", JSON.stringify(record, null, 2) + "\n");
  await output("artifact", `spec-approval-${s.pr.number}-${digest}`);
  await output("approved", "true");
  console.log(
    `Approved package ${digest} by ${sender.login}; ` +
      "immutable record will be uploaded by this workflow.",
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
export async function archiveCheck(): Promise<void> {
  const { pr, files } = await snapshot();
  let summary = pr.base.ref === "main"
    ? "Specification changes are archived and tasks are complete."
    : "Split PR: archive is required only when merging into main.";
  let conclusion = "success";
  try {
    checkArchive(files, pr.base.ref);
  } catch (error) {
    summary = String(error);
    conclusion = "failure";
  }
  await api("/check-runs", {
    method: "POST",
    body: {
      name: "spec-archived",
      head_sha: pr.head.sha,
      status: "completed",
      conclusion,
      details_url: `https://github.com/${repo()}/actions/runs/${Deno.env.get("GITHUB_RUN_ID")}`,
      output: { title: "spec-archived", summary },
    },
  });
  console.log(`spec-archived: ${conclusion}: ${summary}`);
  assert(conclusion === "success", summary);
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
    case "archive-check":
      await archiveCheck();
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
    default:
      throw new Error(
        "Usage: github.ts archive-check|approval|labels [--apply]|platform-check",
      );
  }
}
if (import.meta.main) await main();
