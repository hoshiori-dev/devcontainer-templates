/** Install pinned CI tools; preserve Feature-provided tools in the development container. */
import { join } from "node:path";

const versions = JSON.parse(await Deno.readTextFile("tools.json"));
if (Deno.args.some((arg) => arg !== "--ci") || Deno.args.length > 1) {
  console.error("Usage: bash scripts/setup-tools.sh [--ci]");
  Deno.exit(2);
}
const home = Deno.env.get("HOME");
if (!home) throw new Error("HOME must name the tool installation account");
const prefix = join(home, ".local");
const bin = join(prefix, "bin");
await Deno.mkdir(bin, { recursive: true });
const env = { PATH: `${bin}:${Deno.env.get("PATH")}` };
const nodeVersion = await new Deno.Command("node", { args: ["--version"], stdout: "piped" })
  .output();
if (
  !nodeVersion.success ||
  !new TextDecoder().decode(nodeVersion.stdout).startsWith(`v${versions.node}.`)
) {
  throw new Error(
    `Node ${versions.node} is required; rebuild the dev container or use CI setup-tools`,
  );
}
async function run(command: string, args: string[]) {
  const result = await new Deno.Command(command, { args, env, stdin: "null" }).spawn().status;
  if (!result.success) {
    throw new Error(`${command} exited ${result.code}; fix tool setup and retry`);
  }
}
await run("npm", [
  "install",
  "--global",
  "--prefix",
  prefix,
  `@devcontainers/cli@${versions.devcontainerCli}`,
  ...(Deno.args.includes("--ci") ? [`@fission-ai/openspec@${versions.openSpec}`] : []),
]);
if (!Deno.args.includes("--ci")) {
  await run("pre-commit", ["install", "--install-hooks"]);
  Deno.exit(0);
}
await run("uv", ["tool", "install", "--force", `pre-commit==${versions.preCommit}`]);
await run("uv", ["tool", "install", "--force", `rust-just==${versions.just}`]);

if (Deno.build.os !== "linux" || !["x86_64", "aarch64"].includes(Deno.build.arch)) {
  throw new Error("Tool bootstrap supports Linux amd64/arm64; use the dev container");
}
const arch = Deno.build.arch === "x86_64" ? "x64" : "arm64";
const archive = `betterleaks_${versions.betterleaks}_linux_${arch}.tar.gz`;
const release =
  `https://github.com/betterleaks/betterleaks/releases/download/v${versions.betterleaks}`;
async function fetchRelease(name: string): Promise<Uint8Array> {
  const response = await fetch(`${release}/${name}`);
  if (!response.ok) throw new Error(`Download ${name}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
const checksums = new TextDecoder().decode(await fetchRelease("checksums.txt"));
const checksum = checksums.split("\n").map((line) => line.trim().split(/\s+/))
  .find((parts) => parts[1] === archive)?.[0];
if (!checksum || !/^[a-f0-9]{64}$/.test(checksum)) {
  throw new Error(`Upstream checksums.txt omits ${archive}; do not install an unverified binary`);
}
const bytes = await fetchRelease(archive);
const actual = Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice().buffer)),
)
  .map((byte) => byte.toString(16).padStart(2, "0")).join("");
if (actual !== checksum) throw new Error(`Checksum mismatch for ${archive}`);
const temporary = await Deno.makeTempDir({ prefix: "template-tools-" });
try {
  const path = join(temporary, archive);
  await Deno.writeFile(path, bytes);
  await run("tar", ["-xzf", path, "-C", temporary, "betterleaks"]);
  await Deno.copyFile(join(temporary, "betterleaks"), join(bin, "betterleaks"));
  await Deno.chmod(join(bin, "betterleaks"), 0o755);
} finally {
  await Deno.remove(temporary, { recursive: true });
}
await run(join(bin, "betterleaks"), ["version"]);
const githubPath = Deno.env.get("GITHUB_PATH");
if (githubPath) await Deno.writeTextFile(githubPath, `${bin}\n`, { append: true });
