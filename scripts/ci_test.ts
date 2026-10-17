#!/usr/bin/env -S deno test --allow-read=.github/workflows/ci.yml --allow-run=node

Deno.test("actual CI gate rejects failed, cancelled and unexpected skipped jobs", async () => {
  const workflow = await Deno.readTextFile(".github/workflows/ci.yml");
  const gate = workflow.slice(workflow.indexOf("  ci-gate:"));
  const script = gate.match(/node - <<'JS'\n([\s\S]*?)^\s*JS\s*$/m)?.[1];
  if (!script) throw new Error("Cannot find the CI gate's Node script");
  for (
    const [result, ids, expected] of [
      ["success", '["ubuntu"]', true],
      ["failure", '["ubuntu"]', false],
      ["cancelled", '["ubuntu"]', false],
      ["skipped", '["ubuntu"]', false],
      ["skipped", "[]", true],
    ] as const
  ) {
    const output = await new Deno.Command("node", {
      args: ["-e", script],
      env: {
        NEEDS: JSON.stringify({
          changes: { result: "success" },
          checks: { result: "success" },
          betterleaks: { result: "success" },
          containers: { result },
          devcontainer: { result: "skipped" },
        }),
        IDS: ids,
        DEVCONTAINER: "false",
      },
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (output.success !== expected) {
      throw new Error(`CI gate returned ${output.code} for containers=${result}, ids=${ids}`);
    }
  }
});
