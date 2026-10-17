#!/usr/bin/env -S deno test --allow-read --allow-write --allow-run=tar
import { sourceMatches } from "./github_release.ts";

for (const mode of [0o644, 0o755]) {
  Deno.test(`published archives match source content and executable flag (${mode.toString(8)})`, async () => {
    const original = Deno.cwd();
    const temp = await Deno.makeTempDir({ prefix: "release-verification-test-" });
    const item = { id: "ubuntu", version: "1.0.0", name: "Ubuntu", description: "Test" };
    try {
      await Deno.mkdir(`${temp}/src/ubuntu`, { recursive: true });
      await Deno.writeTextFile(
        `${temp}/src/ubuntu/devcontainer-template.json`,
        JSON.stringify(item),
      );
      await Deno.writeTextFile(`${temp}/src/ubuntu/payload.txt`, "reviewed content\n");
      await Deno.chmod(`${temp}/src/ubuntu/payload.txt`, mode);
      const archive = `${temp}/template.tgz`;
      const packed = await new Deno.Command("tar", {
        args: ["-czf", archive, "-C", `${temp}/src/ubuntu`, "."],
      }).output();
      if (!packed.success) throw new Error("Cannot create test archive");
      const bytes = await Deno.readFile(archive);
      const digest = `sha256:${
        Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
          .map((b) => b.toString(16).padStart(2, "0")).join("")
      }`;
      const remote = {
        digest: `sha256:${"a".repeat(64)}`,
        layers: [{ digest }],
        pull: (_path: string) => Promise.resolve(new Response(bytes)),
      };
      Deno.chdir(temp);
      await sourceMatches(item, remote);
      await Deno.chmod("src/ubuntu/payload.txt", mode ^ 0o111);
      let modeRejected = false;
      try {
        await sourceMatches(item, remote);
      } catch (error) {
        if (
          !(error instanceof Error) || !error.message.includes("Published executable flag differs")
        ) {
          throw error;
        }
        modeRejected = true;
      }
      if (!modeRejected) throw new Error("Accepted different executable bits with identical bytes");
      await Deno.chmod("src/ubuntu/payload.txt", mode);
      await Deno.writeTextFile("src/ubuntu/payload.txt", "different content\n");
      try {
        await sourceMatches(item, remote);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Published content differs")) return;
        throw error;
      }
      throw new Error("Accepted a published archive with different content");
    } finally {
      Deno.chdir(original);
      await Deno.remove(temp, { recursive: true });
    }
  });
}
