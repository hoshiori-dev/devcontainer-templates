#!/usr/bin/env -S deno test --allow-read --allow-write --allow-run=git,deno
import { checkSpecification, parseChanges } from "./pr.ts";

function rejects(output: string): void {
  try {
    checkSpecification(parseChanges(output));
  } catch {
    return;
  }
  throw new Error("Expected missing specification to fail");
}

Deno.test("all deliverable changes require a specification, including both rename paths", () => {
  for (
    const path of [
      "src/ubuntu/README.md",
      "src/ubuntu/devcontainer-template.json",
      "test/ubuntu/test.sh",
    ]
  ) {
    for (const status of ["A", "M", "D"]) rejects(`${status}\0${path}\0`);
    rejects(`R100\0${path}\0docs/moved.md\0`);
    rejects(`R100\0docs/moved.md\0${path}\0`);
  }
});

Deno.test("stable, active, and archived specification additions or edits satisfy the check", () => {
  for (
    const path of [
      "openspec/specs/ubuntu-template/spec.md",
      "openspec/specs/containers/ubuntu-template/spec.md",
      "openspec/changes/update-ubuntu/specs/ubuntu-template/spec.md",
      "openspec/changes/update-ubuntu/specs/containers/ubuntu-template/spec.md",
      "openspec/changes/archive/2026-10-18-update-ubuntu/specs/ubuntu-template/spec.md",
    ]
  ) {
    for (const status of ["A", "M"]) {
      checkSpecification(parseChanges(`M\0test/ubuntu/test.sh\0${status}\0${path}\0`));
    }
    rejects(`M\0test/ubuntu/test.sh\0D\0${path}\0`);
    rejects(`M\0test/ubuntu/test.sh\0R100\0openspec/specs/old/spec.md\0${path}\0`);
  }
});

Deno.test("proposal, design, tasks, and non-spec files cannot replace a specification", () => {
  for (
    const path of [
      "openspec/changes/update/proposal.md",
      "openspec/changes/update/design.md",
      "openspec/changes/update/tasks.md",
      "openspec/specs/ubuntu/README.md",
    ]
  ) rejects(`M\0src/ubuntu/NOTES.md\0M\0${path}\0`);
});

Deno.test("management, documentation, and dependency updates do not require specifications", () => {
  checkSpecification(parseChanges(
    "M\0.github/workflows/ci.yml\0M\0deno.json\0M\0.agents/knowledge/testing.md\0M\0scripts/github.ts\0M\0README.md\0",
  ));
  checkSpecification([]);
});

Deno.test("NUL-delimited change parsing preserves whitespace in filenames", () => {
  const changes = parseChanges("R095\0src/old name\0docs/new\nname\0M\0README.md\0");
  if (
    changes.length !== 2 || changes[0].previous !== "src/old name" ||
    changes[0].path !== "docs/new\nname"
  ) {
    throw new Error("Unexpected rename parsing");
  }
});

Deno.test("CLI compares stacked PRs with their actual target rather than main", async () => {
  const root = await Deno.makeTempDir({ prefix: "template-pr-check-" });
  const script = new URL("./pr.ts", import.meta.url).pathname;
  async function git(...args: string[]): Promise<void> {
    const result = await new Deno.Command("git", {
      cwd: root,
      args,
      stdout: "null",
      stderr: "piped",
    }).output();
    if (!result.success) throw new Error(new TextDecoder().decode(result.stderr));
  }
  async function commit(): Promise<void> {
    await git("add", ".");
    await git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--no-verify",
      "--no-gpg-sign",
      "-m",
      "fixture",
    );
  }
  async function passes(base: string): Promise<boolean> {
    return (await new Deno.Command("deno", {
      cwd: root,
      args: ["run", "--allow-run=git", script, base],
      stdout: "null",
      stderr: "null",
    }).output()).success;
  }
  try {
    await git("init", "-b", "main");
    await Deno.mkdir(`${root}/test/ubuntu`, { recursive: true });
    await Deno.mkdir(`${root}/openspec/specs/ubuntu`, { recursive: true });
    await Deno.writeTextFile(`${root}/test/ubuntu/test.sh`, "baseline\n");
    await Deno.writeTextFile(`${root}/openspec/specs/ubuntu/spec.md`, "baseline spec\n");
    await commit();
    await git("checkout", "-b", "feature");
    await Deno.writeTextFile(`${root}/openspec/specs/ubuntu/spec.md`, "feature spec\n");
    await commit();
    await git("checkout", "-b", "split");
    await Deno.writeTextFile(`${root}/test/ubuntu/test.sh`, "new assertion\n");
    await commit();
    if (await passes("feature")) throw new Error("Inherited spec must not satisfy a split PR");
    if (!await passes("main")) throw new Error("Final PR includes the feature specification edit");
    await Deno.writeTextFile(`${root}/openspec/specs/ubuntu/spec.md`, "split spec\n");
    await commit();
    if (!await passes("feature")) throw new Error("Split PR includes its own specification edit");
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
