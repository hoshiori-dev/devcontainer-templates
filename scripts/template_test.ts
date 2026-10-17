#!/usr/bin/env -S deno test --allow-read --allow-write --allow-run=git,deno
import {
  docs,
  jsonc,
  requireVersionIncrease,
  selectAffected,
  validateMetadata,
} from "./template.ts";
function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
function throws(fn: () => unknown) {
  let failed = false;
  try {
    fn();
  } catch {
    failed = true;
  }
  assert(failed, "Expected rejection");
}
const valid = { id: "ubuntu", version: "1.0.0", name: "Ubuntu", description: "Ubuntu template" };
Deno.test("metadata rejects malformed and unknown fields, unsafe paths and options", () => {
  validateMetadata(valid, "ubuntu");
  for (
    const value of [
      null,
      { ...valid, id: "other" },
      { ...valid, version: "1" },
      { ...valid, extra: true },
      { ...valid, platforms: [42] },
      { ...valid, optionalPaths: ["../secret"] },
      {
        ...valid,
        options: {
          choice: { type: "string", description: "choice", default: "no", enum: ["yes"] },
        },
      },
    ]
  ) throws(() => validateMetadata(value, "ubuntu"));
});
Deno.test("JSONC accepts comments and trailing commas but rejects syntax errors", () => {
  assert(
    (jsonc('{ // hello\n "image": "ubuntu", }') as Record<string, unknown>).image === "ubuntu",
  );
  throws(() => jsonc('{"image": }'));
});
Deno.test("payload versions must strictly increase", () => {
  for (const version of ["1.0.1", "1.1.0", "2.0.0"]) requireVersionIncrease("1.0.0", version);
  for (const version of ["1.0.0", "0.9.9", "invalid"]) {
    throws(() => requireVersionIncrease("1.0.0", version));
  }
  requireVersionIncrease("1.0.0-beta.1", "1.0.0-beta.2+build.3");
  requireVersionIncrease("1.0.0-beta.2", "1.0.0");
  throws(() => requireVersionIncrease("1.0.0+build.1", "1.0.0+build.2"));
});
Deno.test("affected selection handles shared infrastructure and documents", () => {
  const all = ["ubuntu", "debian"];
  assert(
    JSON.stringify(selectAffected(["src/ubuntu/.devcontainer/devcontainer.json"], all)) ===
      '["ubuntu"]',
  );
  for (
    const path of [
      "scripts/template.ts",
      ".github/workflows/ci.yml",
      ".github/actions/setup-tools/action.yml",
      ".github/actions/setup-deno/action.yml",
      "test/lib/helper.sh",
      ".devcontainer/devcontainer.json",
    ]
  ) assert(selectAffected([path], all).length === 2, path);
  assert(
    selectAffected(["README.md", ".agents/knowledge/testing.md"], all)
      .length === 0,
  );
  assert(JSON.stringify(selectAffected(["test/debian/test.sh"], all)) === '["debian"]');
  assert(JSON.stringify(selectAffected(["src/ubuntu/README.md"], all)) === '["ubuntu"]');
  assert(selectAffected(["test/shared.sh"], all).length === 2);
});
Deno.test("docs checks reject missing or stale output and preserve root prose", async () => {
  const directory = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${directory}/src/ubuntu/.devcontainer`, { recursive: true });
    await Deno.writeTextFile(
      `${directory}/src/ubuntu/devcontainer-template.json`,
      JSON.stringify(valid),
    );
    await Deno.writeTextFile(
      `${directory}/src/ubuntu/.devcontainer/devcontainer.json`,
      '{"image":"ubuntu:24.04"}',
    );
    await Deno.writeTextFile(`${directory}/src/ubuntu/NOTES.md`, "Some notes.\n");
    await Deno.writeTextFile(
      `${directory}/README.md`,
      "Before\n<!-- templates:start -->\n<!-- templates:end -->\nAfter\n",
    );
    await Deno.writeTextFile(
      `${directory}/README.zh.md`,
      "前文\n<!-- templates:start -->\n<!-- templates:end -->\n后文\n",
    );
    let rejected = false;
    try {
      await docs(directory, true);
    } catch {
      rejected = true;
    }
    assert(rejected);
    await docs(directory, false);
    await docs(directory, true);
    const root = await Deno.readTextFile(`${directory}/README.md`);
    assert(root.startsWith("Before\n") && root.endsWith("\nAfter\n"));
    const chinese = await Deno.readTextFile(`${directory}/README.zh.md`);
    assert(chinese.startsWith("前文\n") && chinese.endsWith("\n后文\n"));
    await Deno.writeTextFile(`${directory}/README.zh.md`, chinese.replace("1.0.0", "0.0.0"));
    rejected = false;
    try {
      await docs(directory, true);
    } catch {
      rejected = true;
    }
    assert(rejected, "Stale Chinese table must be rejected");
    await docs(directory, false);
    await Deno.writeTextFile(`${directory}/src/ubuntu/NOTES.md`, "Changed notes.\n");
    rejected = false;
    try {
      await docs(directory, true);
    } catch {
      rejected = true;
    }
    assert(rejected);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("repository validation rejects unchanged versions, broken bases and symlink payloads", async () => {
  const { validate, changedPaths } = await import("./template.ts");
  const directory = await Deno.makeTempDir();
  const git = async (...args: string[]) => {
    const output = await new Deno.Command("git", {
      args,
      cwd: directory,
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(output.success, new TextDecoder().decode(output.stderr));
  };
  const rejects = async (fn: () => Promise<unknown>) => {
    let failed = false;
    try {
      await fn();
    } catch {
      failed = true;
    }
    assert(failed, "Expected validation rejection");
  };
  try {
    await Deno.mkdir(`${directory}/src/ubuntu/.devcontainer`, { recursive: true });
    await Deno.writeTextFile(
      `${directory}/src/ubuntu/devcontainer-template.json`,
      JSON.stringify(valid),
    );
    await Deno.writeTextFile(
      `${directory}/src/ubuntu/.devcontainer/devcontainer.json`,
      '{"image":"ubuntu:24.04"}',
    );
    await git("init");
    await git("add", ".");
    await git(
      "-c",
      "user.name=Test fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      "fixture",
    );
    await validate(directory, "HEAD");
    await Deno.writeTextFile(
      `${directory}/src/ubuntu/.devcontainer/devcontainer.json`,
      '{"image":"ubuntu:22.04"}',
    );
    await rejects(() => validate(directory, "HEAD"));
    await Deno.writeTextFile(
      `${directory}/src/ubuntu/devcontainer-template.json`,
      JSON.stringify({ ...valid, version: "1.0.1" }),
    );
    await validate(directory, "HEAD");
    await rejects(() => changedPaths(directory, "nonexistent-base"));
    await Deno.symlink("/etc/os-release", `${directory}/src/ubuntu/escape`);
    await rejects(() => validate(directory));
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
