#!/usr/bin/env -S deno run --allow-run=git
/** Read-only checks shared by local development and ordinary PR CI. */
export interface Change {
  status: string;
  path: string;
  previous?: string;
}

export function parseChanges(output: string): Change[] {
  const fields = output.split("\0");
  fields.pop();
  const changes: Change[] = [];
  while (fields.length) {
    const status = fields.shift()!;
    const path = fields.shift()!;
    if (status.startsWith("R") || status.startsWith("C")) {
      changes.push({ status, previous: path, path: fields.shift()! });
    } else changes.push({ status, path });
  }
  return changes;
}

export function checkSpecification(changes: Change[]): void {
  const deliverable = changes.some((file) =>
    [file.path, file.previous].some((path) => path && /^(src|test)\//.test(path))
  );
  const specification = changes.some((file) =>
    /^(A|M|R\d+|C\d+)$/.test(file.status) && file.status !== "R100" &&
    /^openspec\/(specs\/.+|changes\/(?:archive\/[^/]+|[^/]+)\/specs\/.+)\/spec\.md$/
      .test(file.path)
  );
  if (deliverable && !specification) {
    throw new Error(
      "Changes to src/ or test/ require an added or modified OpenSpec spec.md in this PR.",
    );
  }
}

if (import.meta.main) {
  const [base = "origin/main"] = Deno.args;
  const result = await new Deno.Command("git", {
    args: ["diff", "--name-status", "-z", "--find-renames", `${base}...HEAD`],
    stdout: "piped",
  }).output();
  if (!result.success) throw new Error("Cannot compare PR changes with the requested base.");
  checkSpecification(parseChanges(new TextDecoder().decode(result.stdout)));
  console.log("PR specification companion check passed.");
}
