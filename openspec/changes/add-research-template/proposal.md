# Proposal

## Why

Researchers working with coding agents need a ready environment that reaches remote compute through
the Colab CLI or SkyPilot (SSH node pools or Slurm) and turns results into reports. The collection
has only a minimal Ubuntu template, so each project assembles these tools by hand. Requested in
[#12](https://github.com/hoshiori-dev/devcontainer-templates/issues/12).

## What Changes

- Add a `research` template, version `1.0.0`, on the official Ubuntu 24.04 image with the `vscode`
  user, zsh, git, git-lfs, Quarto, the Colab CLI, uv, pre-commit, just, and SkyPilot.
- Add one option, `skypilotExtra` (`slurm` by default, or `ssh` or `kubernetes`).
- Request the EditorConfig, Codex (`openai.chatgpt`), Python, Ruff, and ty extensions.
- Keep SkyPilot, Slurm, Kubernetes, and Colab CLI state in per-container named volumes.
- Ship optional `.pre-commit-config.yaml`, `.editorconfig`, `.github/dependabot.yml`, and an
  `AGENTS.md` guiding agents through remote runs and Quarto reports.
- Document how consumers add zero or more coding agents (Codex, Claude Code, Antigravity, OpenCode)
  and LaTeX through Feature selection; the template does not install them.
- Add container assertions for the default configuration on native amd64 and arm64.

## Capabilities

### New Capabilities

- `research-template`: The remote-research development environment, its option, optional starter
  files, and supported consumer application behavior.

### Modified Capabilities

None.

## Impact

Adds `src/research/` and `test/research/`, and regenerates the template README and root template
indexes. The test harness and release workflow are unchanged; the new template is published by the
existing automation after a maintainer merge. Consumers depend on Features from
`hoshiori-dev/devcontainer-features` and the official `devcontainers/features` collection.
