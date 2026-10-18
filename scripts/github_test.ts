#!/usr/bin/env -S deno test
import {
  approvalActor,
  checkApprovalHead,
  checkArchive,
  packageDigest,
  packagePath,
  publishResult,
  trustedApprovalRun,
} from "./github.ts";
function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
function rejects(fn: () => unknown): void {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error("Expected rejection");
}
const proposal = { path: "openspec/changes/ubuntu/proposal.md", content: "Ubuntu 24.04" };
const delta = { path: "openspec/changes/ubuntu/specs/template/spec.md", content: "non-root user" };
Deno.test("approval covers content, ignores tasks, and survives archival", async () => {
  const original = await packageDigest([proposal, delta]);
  assert(original !== await packageDigest([{ ...proposal, content: "Ubuntu 26.04" }, delta]));
  assert(original !== await packageDigest([proposal, { ...delta, content: "root user" }]));
  assert(
    original ===
      await packageDigest([delta, proposal, {
        path: "openspec/changes/ubuntu/tasks.md",
        content: "implementation changed",
      }]),
  );
  assert(
    original ===
      await packageDigest(
        [proposal, delta].map((f) => ({
          ...f,
          path: f.path.replace("changes/ubuntu/", "changes/archive/2026-10-17-ubuntu/"),
        })),
      ),
  );
});
Deno.test("approval rejects bot identities, contributors, and missing identities", () => {
  assert(approvalActor({ type: "User", login: "maintainer" }, "admin"));
  assert(approvalActor({ type: "User", login: "maintainer" }, "maintain"));
  assert(!approvalActor({ type: "Bot", login: "github-actions[bot]" }, "admin"));
  assert(!approvalActor({ type: "User", login: "contributor" }, "write"));
  assert(!approvalActor({ type: "User" }, "admin"));
});
Deno.test("approval rejects a PR pushed after the maintainer's label event", () => {
  const approvedHead = "a".repeat(40);
  checkApprovalHead(approvedHead, approvedHead);
  rejects(() => checkApprovalHead(approvedHead, "b".repeat(40)));
  rejects(() => checkApprovalHead(undefined, approvedHead));
});
Deno.test("archive gate blocks active changes only when targeting main", () => {
  checkArchive([proposal], "feature/ubuntu");
  rejects(() => checkArchive([proposal], "main"));
  checkArchive([], "main");
  checkArchive(
    [{ ...proposal, path: "openspec/changes/archive/2026-10-17-ubuntu/proposal.md" }, {
      path: "openspec/changes/archive/2026-10-17-ubuntu/tasks.md",
      content: "- [x] complete",
    }],
    "main",
  );
  assert(packagePath("openspec/specs/template/spec.md") === undefined);
});
Deno.test("release parses complete exact versions and explicit skipped entries", () => {
  const metadata = [{ id: "ubuntu", version: "1.0.0" }];
  publishResult('{"ubuntu":{}}', metadata);
  publishResult(
    JSON.stringify({
      ubuntu: {
        digest: `sha256:${"a".repeat(64)}`,
        version: "1.0.0",
        publishedTags: ["1.0.0", "1", "latest"],
      },
    }),
    metadata,
  );
  for (const output of ["{}", '{"ubuntu":null}', '{"ubuntu":{"digest":"sha256:bad"}}']) {
    rejects(() => publishResult(output, metadata));
  }
});

Deno.test("approval rejects records from spoofed, failed, or untrusted workflow runs", () => {
  const run = {
    workflow_id: 42,
    path: ".github/workflows/spec-approval.yml",
    event: "pull_request_target",
    conclusion: "success",
    repository: { id: 24 },
  };
  assert(trustedApprovalRun(run, 42, 24));
  for (
    const tamper of [
      { workflow_id: 43 },
      { path: ".github/workflows/other.yml" },
      { event: "pull_request" },
      { event: "workflow_dispatch" },
      { conclusion: "failure" },
      { conclusion: "in_progress" },
      { repository: { id: 25 } },
    ]
  ) {
    assert(!trustedApprovalRun({ ...run, ...tamper }, 42, 24));
  }
});

Deno.test("archive requires completed tasks independently of approval labels", () => {
  const archived = { ...proposal, path: "openspec/changes/archive/2026-10-18-ubuntu/proposal.md" };
  rejects(() => checkArchive([archived], "main"));
  rejects(() =>
    checkArchive([archived, {
      path: "openspec/changes/archive/2026-10-18-ubuntu/tasks.md",
      content: "- [x] one\n- [ ] two",
    }], "main")
  );
});
