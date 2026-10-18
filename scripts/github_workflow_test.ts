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
  let postedCheck: { name: string; conclusion: string } | undefined;
  let approvalRequests = 0;
  globalThis.fetch = (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace("/repos/fixture/templates", "");
    let result: unknown;
    if (path === "/pulls/1") result = pr;
    else if (path === "/pulls/1/files") result = files.map((file) => ({ filename: file.path }));
    else if (path === `/git/trees/${pr.head.sha}`) {
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
        head_sha: "base",
        repository: { id: 24 },
      };
    } else if (path === "/compare/base...main") result = { status: "identical" };
    else if (path === "/issues/1/labels/spec%3Aapproved" && init?.method === "DELETE") {
      deleted++;
      result = [];
    } else if (path === "/check-runs" && init?.method === "POST") {
      postedCheck = JSON.parse(String(init.body));
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
    files[1].content = "Changed specification";
    await approval();
    if (Number(deleted) !== 1) throw new Error("Changed package did not remove approval");

    const beforeArchive = approvalRequests;
    pr.labels = [];
    if (await archivePassed()) throw new Error("Active change passed main archive gate");
    pr.base.ref = "feature/ubuntu";
    if (!await archivePassed()) throw new Error("Active change blocked split PR");
    pr.base.ref = "main";
    files.splice(0, files.length); // No change package, as in an ordinary dependency PR.
    if (!await archivePassed()) throw new Error("Missing approval blocked an ordinary PR");
    if (postedCheck?.name !== "spec-archived" || postedCheck.conclusion !== "success") {
      throw new Error("Wrong merge check");
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
