#!/usr/bin/env -S deno test --allow-read --allow-write --allow-env=GH_TOKEN,GITHUB_REPOSITORY,GITHUB_EVENT_PATH,GITHUB_OUTPUT,GITHUB_RUN_ID
import { approval, archiveCheck } from "./github.ts";

Deno.test("approval label lifecycle is independent of the archive merge check", async () => {
  const root = await Deno.makeTempDir({ prefix: "template-approval-check-" });
  const previousDirectory = Deno.cwd();
  const previousFetch = globalThis.fetch;
  const environment = {
    GH_TOKEN: "fixture-token",
    GITHUB_REPOSITORY: "fixture/templates",
    GITHUB_EVENT_PATH: `${root}/event.json`,
    GITHUB_OUTPUT: `${root}/output`,
    GITHUB_RUN_ID: "1",
  };
  const previousEnvironment = Object.fromEntries(
    Object.keys(environment).map((key) => [key, Deno.env.get(key)]),
  );
  const pr = {
    number: 1,
    base: { ref: "main", sha: "base" },
    head: { sha: "head" },
    labels: [{ name: "spec:approved" }],
  };
  const files = [
    { path: "openspec/changes/ubuntu/proposal.md", content: "Proposal" },
    { path: "openspec/changes/ubuntu/specs/ubuntu/spec.md", content: "Specification" },
  ];
  let recordedArtifact = "";
  let deleted = 0;
  const postedChecks: { name: string; status: string; conclusion?: string; head_sha: string }[] =
    [];
  let failTree = false;
  let failPullRequest = false;
  let approvalRequests = 0;
  let workflowChanged = false;
  let workflowMissing = false;
  globalThis.fetch = (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace("/repos/fixture/templates", "");
    let result: unknown;
    if (path === "/pulls/1") {
      if (failPullRequest) return Promise.resolve(new Response(null, { status: 503 }));
      result = pr;
    } else if (path === "/pulls/1/files") result = files.map((file) => ({ filename: file.path }));
    else if (path === `/git/trees/${pr.head.sha}`) {
      if (failTree) return Promise.resolve(new Response(null, { status: 503 }));
      result = {
        truncated: false,
        tree: files.map((file, index) => ({ path: file.path, sha: String(index), type: "blob" })),
      };
    } else if (path.startsWith("/git/blobs/")) {
      const content = files[Number(path.split("/").at(-1))].content;
      result = { content: btoa(content), encoding: "base64", size: content.length };
    } else if (path === "/collaborators/maintainer/permission") {
      result = { permission: "admin", user: { login: "maintainer", type: "User" } };
    } else if (path === "/actions/workflows/spec-approval.yml") {
      approvalRequests++;
      result = { id: 42 };
    } else if (path === "/actions/artifacts") {
      result = {
        artifacts: url.searchParams.get("name") === recordedArtifact
          ? [{ name: recordedArtifact, expired: false, workflow_run: { id: 7 } }]
          : [],
      };
    } else if (path === "") result = { id: 24, default_branch: "main" };
    else if (path === "/actions/runs/7") {
      result = {
        workflow_id: 42,
        path: ".github/workflows/spec-approval.yml",
        event: "pull_request_target",
        conclusion: "success",
        actor: { login: "maintainer" },
        head_sha: "approval-pr-head",
        repository: { id: 24 },
      };
    } else if (path === "/contents/.github/workflows/spec-approval.yml") {
      if (url.searchParams.get("ref") !== "main" && workflowMissing) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      result = {
        sha: url.searchParams.get("ref") === "main" || !workflowChanged
          ? "trusted-workflow"
          : "changed-workflow",
      };
    } else if (path === "/issues/1/labels/spec%3Aapproved" && init?.method === "DELETE") {
      deleted++;
      result = [];
    } else if (path === "/check-runs" && init?.method === "POST") {
      postedChecks.push(JSON.parse(String(init.body)));
      result = {};
    } else throw new Error(`Unexpected API call: ${path}`);
    return Promise.resolve(Response.json(result));
  };
  async function event(action: string): Promise<void> {
    await Deno.writeTextFile(
      environment.GITHUB_EVENT_PATH,
      JSON.stringify({
        action,
        pull_request: pr,
        sender: { login: "maintainer", type: "User" },
        label: { name: "spec:approved" },
      }),
    );
  }
  async function archivePassed(): Promise<boolean> {
    try {
      await archiveCheck();
      return true;
    } catch {
      return false;
    }
  }
  try {
    Deno.chdir(root);
    for (const [key, value] of Object.entries(environment)) Deno.env.set(key, value);
    await event("labeled");
    await approval();
    const record = JSON.parse(await Deno.readTextFile("approval.json"));
    if (record.actor !== "maintainer" || record.approved_head !== "head") {
      throw new Error("Approval was not recorded");
    }
    recordedArtifact = `spec-approval-1-${record.digest}`;
    await event("synchronize");
    pr.head.sha = "implementation-head"; // The approval package is unchanged.
    await approval();
    if (deleted !== 0) throw new Error("Implementation-only update removed approval");
    pr.base.ref = "feature/ubuntu";
    await approval();
    if (deleted !== 0) throw new Error("Split PR lost an unchanged approval package");
    workflowChanged = true;
    await approval();
    if (Number(deleted) !== 1) throw new Error("Untrusted workflow definition retained approval");
    workflowChanged = false;
    workflowMissing = true;
    await approval();
    if (Number(deleted) !== 2) throw new Error("Missing workflow definition retained approval");
    workflowMissing = false;
    files[1].content = "Changed specification";
    await approval();
    if (Number(deleted) !== 3) throw new Error("Changed package did not remove approval");

    const beforeArchive = approvalRequests;
    pr.labels = [];
    pr.base.ref = "main";
    if (!await archivePassed()) throw new Error("Normal archive waiting failed the workflow");
    const pending = postedChecks.at(-2);
    const waiting = postedChecks.at(-1);
    if (
      pending?.name !== "spec-archived" || pending.status !== "in_progress" ||
      pending.conclusion !== undefined || pending.head_sha !== pr.head.sha ||
      waiting?.name !== "awaiting-archive" || waiting.conclusion !== "success"
    ) throw new Error("Archive waiting did not leave the required check pending on the PR head");
    pr.base.ref = "feature/ubuntu";
    if (!await archivePassed()) throw new Error("Active change blocked split PR");
    pr.base.ref = "main";
    // Retargeting the same commit must override the earlier successful archive result.
    if (!await archivePassed() || postedChecks.at(-2)?.status !== "in_progress") {
      throw new Error("Retargeting retained a successful archive verdict");
    }
    files.splice(0, files.length); // No change package, as in an ordinary dependency PR.
    if (!await archivePassed()) throw new Error("Missing approval blocked an ordinary PR");
    if (
      postedChecks.at(-1)?.name !== "spec-archived" || postedChecks.at(-1)?.conclusion !== "success"
    ) {
      throw new Error("Wrong merge check");
    }
    files.push({
      path: "openspec/changes/archive/2026-10-18-repair/proposal.md",
      content: "Repair",
    });
    if (await archivePassed() || postedChecks.at(-1)?.conclusion !== "failure") {
      throw new Error("Missing archived tasks was mistaken for normal waiting");
    }
    files.push({
      path: "openspec/changes/archive/2026-10-18-repair/tasks.md",
      content: "- [ ] pending",
    });
    if (await archivePassed()) throw new Error("Incomplete archive passed");
    files[1].content = "- [x] verified";
    if (!await archivePassed()) throw new Error("Complete proposal-only archive failed");
    // A successful split verdict must not survive retarget + failed API reads on the same SHA.
    pr.base.ref = "feature/repair";
    if (!await archivePassed()) throw new Error("Split verdict failed");
    pr.base.ref = "main";
    await event("edited");
    failTree = true;
    if (await archivePassed()) throw new Error("Input retrieval failure passed validation");
    const failedReadPending = postedChecks.at(-2);
    if (
      failedReadPending?.name !== "spec-archived" || failedReadPending.status !== "in_progress" ||
      postedChecks.at(-1)?.name !== "spec-archived" ||
      postedChecks.at(-1)?.conclusion !== "failure"
    ) throw new Error("Input retrieval failure retained a stale successful archive check");
    failTree = false;
    failPullRequest = true;
    if (
      await archivePassed() || postedChecks.at(-2)?.status !== "in_progress" ||
      postedChecks.at(-1)?.conclusion !== "failure"
    ) {
      throw new Error("PR lookup failure retained a stale successful archive check");
    }
    if (approvalRequests !== beforeArchive) {
      throw new Error("Archive check consulted approval records");
    }
  } finally {
    globalThis.fetch = previousFetch;
    Deno.chdir(previousDirectory);
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
    await Deno.remove(root, { recursive: true });
  }
});
