#!/usr/bin/env -S deno test
import {
  approvalActor,
  checkApprovalHead,
  checkArchive,
  metadataBehaviorChanged,
  packageDigest,
  packagePath,
  policyChanges,
  publishResult,
  stableChangesCovered,
  stableDeltaMatches,
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
Deno.test("policy classifies both sides of renames out of protected directories", () => {
  const changes = policyChanges([
    { filename: "docs/spec.md", previous_filename: "openspec/specs/template/spec.md" },
    { filename: "scripts/install.sh", previous_filename: "src/ubuntu/install.sh" },
    { filename: "docs/metadata.json", previous_filename: "src/ubuntu/devcontainer-template.json" },
  ]);
  assert(changes.behavior);
  assert(changes.stable.includes("openspec/specs/template/spec.md"));
  assert(changes.metadata.includes("src/ubuntu/devcontainer-template.json"));
  const moved = policyChanges([
    { filename: "src/debian/install.sh", previous_filename: "src/ubuntu/install.sh" },
  ]);
  assert(moved.paths.includes("src/debian/install.sh"));
  assert(moved.paths.includes("src/ubuntu/install.sh"));
  assert(!policyChanges([{ filename: "README.md" }]).behavior);
});
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
Deno.test("archive gate is pending in drafts and blocks ready PRs", () => {
  checkArchive([proposal], true);
  rejects(() => checkArchive([proposal], false));
  checkArchive(
    [{ ...proposal, path: "openspec/changes/archive/2026-10-17-ubuntu/proposal.md" }, {
      path: "openspec/changes/archive/2026-10-17-ubuntu/tasks.md",
      content: "- [x] complete",
    }],
    false,
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

Deno.test("archived deltas require complete approved requirement bodies", () => {
  const requirement =
    "### Requirement: Non-root user\nThe user MUST be vscode.\n\n#### Scenario: Start\n- **WHEN** started\n- **THEN** the user is vscode.\n";
  const stable = "# Template\n## Requirements\n" + requirement;
  const added = "## ADDED Requirements\n" + requirement;
  assert(stableDeltaMatches(added, stable));
  assert(!stableDeltaMatches(added, stable.replace("MUST be vscode", "MUST be root")));
  assert(!stableDeltaMatches("## REMOVED Requirements\n" + requirement, stable));
  assert(stableDeltaMatches("## REMOVED Requirements\n" + requirement, ""));
  assert(stableChangesCovered([added], "", stable));
  assert(
    !stableChangesCovered(
      [added],
      "",
      stable + "\n### Requirement: Unapproved behavior\nThe container MUST run as root.",
    ),
  );
  const changed = stable.replace("MUST be vscode", "MUST be root");
  assert(!stableChangesCovered([added], stable, changed));
  const modified = "## MODIFIED Requirements\n" +
    requirement.replace("MUST be vscode", "MUST be root");
  assert(stableChangesCovered([modified], stable, changed));
  assert(
    !stableChangesCovered(
      [modified],
      stable + "\n### Requirement: Retained behavior\nKeep me.\n",
      changed,
    ),
  );
  assert(stableChangesCovered(["## REMOVED Requirements\n" + requirement], stable, ""));
});
Deno.test("renamed requirements retain their approved bodies unless explicitly modified", () => {
  const before = "## Requirements\n### Requirement: Old name\nThe behavior MUST remain.\n";
  const after = before.replace("Old name", "New name");
  const delta =
    "## RENAMED Requirements\n- FROM: `### Requirement: Old name`\n- TO: `### Requirement: New name`\n";
  assert(stableChangesCovered([delta], before, after));
  assert(!stableChangesCovered([delta], before, after.replace("MUST remain", "MUST change")));
  const modified =
    "\n## MODIFIED Requirements\n### Requirement: New name\nThe behavior MUST change.\n";
  assert(
    stableChangesCovered([delta + modified], before, after.replace("MUST remain", "MUST change")),
  );
});

Deno.test("metadata versions and descriptions use ordinary PRs while option behavior requires a spec", () => {
  const original = {
    id: "ubuntu",
    version: "1.0.0",
    name: "Ubuntu",
    options: { flavor: { default: "minimal" } },
  };
  assert(
    !metadataBehaviorChanged(
      JSON.stringify(original),
      JSON.stringify({ ...original, version: "1.0.1", description: "Updated docs" }),
    ),
  );
  assert(
    metadataBehaviorChanged(
      JSON.stringify(original),
      JSON.stringify({ ...original, options: { flavor: { default: "full" } } }),
    ),
  );
  assert(
    metadataBehaviorChanged(
      JSON.stringify(original),
      JSON.stringify({ ...original, id: "renamed" }),
    ),
  );
});
