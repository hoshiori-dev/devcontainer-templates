# Design

## Context

The collection has one template, `ubuntu`, and the test harness publishes each template to a local
registry, applies it with default options, starts it, and runs `test/<id>/test.sh` inside. The
requested tools ship as Dev Container Features from `hoshiori-dev/devcontainer-features`; none of
them accepts a value that skips installation, and template options can only substitute strings into
template files. See `proposal.md` for motivation and `specs/research-template/spec.md` for the
behavior contract.

## Goals / Non-Goals

**Goals:**

- Keep the template's fixed Feature set to tools every research workspace uses.
- Make optional tools selectable without changes to the upstream Features.
- Keep remote-tool state across rebuilds without depending on host directories.

**Non-Goals:**

- Test harness support for option or Feature combinations other than the defaults.
- Project scaffolding beyond the starter files, such as `pyproject.toml`, Quarto projects, or
  SkyPilot task examples.

## Decisions

### Fixed and consumer-selected Features

The template fixes `common-utils:2` (with `configureZshAsDefaultShell`), `git:1`, `git-lfs:1`,
`quarto:1`, `colab-cli:1`, and `uv:1`. Coding agents and LaTeX are left to the Feature selection
step that VS Code shows after a template and that `devcontainer templates apply --features` accepts;
`NOTES.md` lists their references. This supports zero or more agents directly.

Alternatives: adding a skip value to each upstream Feature and exposing template booleans would
block this template on several releases of another repository, and the Antigravity Feature has no
options to which a skip value could be added. Installing all agents enlarges every image and adds
unused login volumes.

### SkyPilot through uv

uv's `toolsToInstall` is `pre-commit,rust-just,skypilot[${templateOption:skypilotExtra}]`. The uv
Feature accepts at most one extra per entry, so the option is an enum rather than a list. `slurm` is
the default by maintainer decision; `ssh` and `kubernetes` are the alternatives. The `ssh` extra
currently differs from `slurm` mainly by the Kubernetes client that SSH node pools use; consumers
who need both backends choose `ssh` and add the Slurm dependency themselves.

### Extensions

The template lists only the extensions the Features do not supply. The Quarto, LaTeX, and Colab
Features contribute `quarto.quarto`, `James-Yu.latex-workshop`, and `google.colab`, so the report
extensions follow the selected Features without template logic.

### Remote-tool state

Named volumes `research-sky-${devcontainerId}`, `research-slurm-${devcontainerId}`,
`research-kube-${devcontainerId}`, and `research-colab-${devcontainerId}` mount at `~/.sky`,
`~/.slurm`, `~/.kube`, and `~/.config/colab-cli`. These are where SkyPilot keeps its state and SSH
node pool configuration, where its Slurm integration reads cluster configuration, where SSH node
pools write the kubeconfig, and where the Colab CLI stores its token and sessions. Docker creates
the mount targets as root, so a lifecycle command changes their ownership to the remote user.

SSH keys are not stored by the template: VS Code forwards the host's SSH agent, and users can
otherwise configure keys inside the container. Bind-mounting host `~/.ssh` or `~/.sky` was rejected
because it fails where those host directories are absent and in hosted environments.

### Starter files

All four starter files are `optionalPaths`. `.pre-commit-config.yaml` uses `pre-commit-hooks`
(trailing whitespace, end of file, YAML, TOML, large files) and `ruff-pre-commit` (check and format)
with pinned revisions that Dependabot updates. `dependabot.yml` lists `devcontainers`, `pre-commit`,
`github-actions`, and `uv` at `/` on a weekly schedule; `NOTES.md` states that the `pre-commit` and
`uv` entries report missing files until the consumer keeps the pre-commit configuration or creates a
uv project. `.editorconfig` sets UTF-8, LF, final newlines, and indentation defaults for Python,
YAML, JSON, Markdown, and Quarto files.

`AGENTS.md` is written for coding agents and stays short: the remote-run workflow for each tool,
where results and reports go, and the rules in the specification. It names commands but does not
copy upstream CLI references, which change between releases.

### Verification

`test/research/test.sh` asserts the default container: OS and user, shell, commands, absence of
agent and LaTeX commands, the Slurm dependency in SkyPilot's environment, writable state mounts, and
the applied starter files. The existing harness runs it on native amd64 and arm64.

## Risks / Trade-offs

- [`latest` Feature versions change between builds] → Major-version Feature references follow the
  collection's practice; consumers rebuild or pin Feature options for reproducibility.
- [Non-default `skypilotExtra` values and added Features are untested] → The values are checked
  statically by template validation; combination tests are a separate harness change.
- [Dependabot reports missing manifests for omitted or not-yet-created files] → Documented in
  `NOTES.md`; consumers remove the entries they do not use.
- [Claude Code may not read `AGENTS.md` without an import] → Verified during implementation;
  `NOTES.md` documents the import when it is needed.

## Open Questions

None.
