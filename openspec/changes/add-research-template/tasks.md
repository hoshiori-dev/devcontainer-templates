# Tasks

## 1. Template content

- [x] 1.1 Add `src/research/devcontainer-template.json` (id `research`, version `1.0.0`,
      `skypilotExtra` enum with default `slurm`, four optional paths); verify with
      `just check origin/main`.
- [x] 1.2 Add `src/research/.devcontainer/devcontainer.json` with the fixed Features, uv tools,
      state volumes, ownership command, and extensions; verify with `just test research`.
- [x] 1.3 Add the starter `.pre-commit-config.yaml`, `.editorconfig`, `.github/dependabot.yml`, and
      `AGENTS.md`; verify the pre-commit configuration passes on the applied files inside the
      container test.
- [x] 1.4 Add `src/research/NOTES.md` covering the option, consumer-selected agents and LaTeX,
      optional files, Dependabot caveats, and credentials; run `just docs` and inspect the generated
      READMEs.

## 2. Verification

- [x] 2.1 Add `test/research/test.sh` asserting the default-container requirements; pass
      `shellcheck` through `just check origin/main`.
- [x] 2.2 Run `just package` and `just test research` on amd64 and record the result.
- [x] 2.3 Confirm native amd64 and arm64 template tests pass in PR CI.
- [x] 2.4 Verify that remote-tool state survives a container rebuild and record how it was checked.
