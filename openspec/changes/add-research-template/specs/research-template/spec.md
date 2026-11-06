# Spec Delta

## Purpose

Provide a development environment in which a researcher and a coding agent run experiments on remote
compute through the Colab CLI or SkyPilot and write the results up as Quarto reports.

## ADDED Requirements

### Requirement: Research base environment

The research template SHALL provide an Ubuntu 24.04 development container using the official Dev
Containers Ubuntu image and the non-root `vscode` remote user, with zsh as the default shell and
`git` and `git-lfs` available.

#### Scenario: Apply and open the template with defaults

- **WHEN** a consumer applies version `1.0.0` of the `research` template to an empty workspace
  without option values and starts its development container
- **THEN** `/etc/os-release` identifies Ubuntu version `24.04`
- **AND** commands run as user `vscode` with a nonzero UID
- **AND** the user's login shell is zsh
- **AND** `git` and `git lfs` run successfully

### Requirement: Report authoring tools

The research template SHALL install Quarto for the remote user. It SHALL NOT install a TeX
distribution; LaTeX remains a consumer-selected addition.

#### Scenario: Use Quarto in the default container

- **WHEN** the default template container starts
- **THEN** `quarto --version` succeeds as user `vscode`
- **AND** no `latex` or `tlmgr` command is on the user's `PATH`

### Requirement: Remote compute tools

The research template SHALL install the Google Colab CLI and SkyPilot as commands of the remote
user, without requiring credentials or creating remote sessions during installation.

#### Scenario: Use the remote compute commands

- **WHEN** the default template container starts
- **THEN** `colab version` and `sky --version` succeed as user `vscode`
- **AND** no Colab session or SkyPilot cluster has been created

### Requirement: SkyPilot extra selection

The research template SHALL expose one option, `skypilotExtra`, selecting the SkyPilot extra to
install. Its allowed values SHALL be `slurm`, `ssh`, and `kubernetes`, and its default SHALL be
`slurm`.

#### Scenario: Default SkyPilot extra

- **WHEN** the template is applied without a value for `skypilotExtra`
- **THEN** SkyPilot is installed with its `slurm` extra
- **AND** the Slurm-specific dependencies are importable from SkyPilot's environment

#### Scenario: Selected SkyPilot extra

- **WHEN** the template is applied with `skypilotExtra` set to `ssh` or `kubernetes`
- **THEN** the generated configuration installs SkyPilot with that extra instead of `slurm`

### Requirement: Project tooling

The research template SHALL provide `uv`, `pre-commit`, and `just` as commands of the remote user.

#### Scenario: Use the project tooling

- **WHEN** the default template container starts
- **THEN** `uv --version`, `pre-commit --version`, and `just --version` succeed as user `vscode`

### Requirement: Editor integration

The research template SHALL request the VS Code extensions `EditorConfig.EditorConfig`,
`openai.chatgpt`, `ms-python.python`, `charliermarsh.ruff`, and `astral-sh.ty`. Extensions
contributed by installed Features SHALL remain in effect.

#### Scenario: Inspect the generated configuration

- **WHEN** the template is applied
- **THEN** the generated `devcontainer.json` lists each required extension under
  `customizations.vscode.extensions`

### Requirement: Consumer-selected agents and LaTeX

The research template SHALL NOT install coding-agent CLIs or LaTeX. Its documentation SHALL list the
Feature references for Codex, Claude Code, Antigravity, OpenCode, and LaTeX, and explain how to add
zero or more of them when applying the template.

#### Scenario: Default container without agents

- **WHEN** the default template container starts
- **THEN** none of `codex`, `claude`, `agy`, or `opencode` is on the user's `PATH`

#### Scenario: Find the optional Feature references

- **WHEN** a consumer reads the template's documentation
- **THEN** it names the Feature reference for each optional agent and for LaTeX
- **AND** it explains how to add them through the tool's Feature selection when applying the
  template

### Requirement: Persistent remote tool state

The research template SHALL keep `~/.sky`, `~/.slurm`, `~/.kube`, and `~/.config/colab-cli` of the
remote user in named volumes specific to each development container, writable by that user. It SHALL
NOT bind-mount host directories or credentials.

#### Scenario: Write remote tool state

- **WHEN** the default template container starts
- **THEN** each of the four directories is a mount point and is writable by user `vscode`
- **AND** the generated configuration contains no bind mount

#### Scenario: Rebuild the container

- **WHEN** a consumer rebuilds the development container of the same workspace
- **THEN** files previously written to those directories are still present

### Requirement: Optional starter files

The research template SHALL provide `.pre-commit-config.yaml`, `.editorconfig`,
`.github/dependabot.yml`, and `AGENTS.md` as optional paths that a consumer can omit when applying
the template.

#### Scenario: Apply with all optional files

- **WHEN** the template is applied without omitting paths
- **THEN** all four files exist in the workspace

#### Scenario: Omit optional files

- **WHEN** the template is applied with some of those paths omitted
- **THEN** the omitted files are absent and the development container still starts

### Requirement: Starter file contents

The pre-commit configuration SHALL run basic file hygiene checks and Ruff linting and formatting.
The Dependabot configuration SHALL check the `devcontainers`, `pre-commit`, `github-actions`, and
`uv` ecosystems at the repository root. The EditorConfig file SHALL be a root configuration.

#### Scenario: Run the starter pre-commit configuration

- **WHEN** a consumer runs `pre-commit run --all-files` in a Git repository containing the applied
  template
- **THEN** the configured hooks install and pass on the unmodified template files

### Requirement: Agent research guidance

The optional `AGENTS.md` SHALL instruct coding agents how to run experiments with the Colab CLI and
SkyPilot, record results, and write reports with Quarto. It SHALL require keeping credentials out of
the repository, confirming with the user before starting billable remote resources, and releasing
remote resources after use.

#### Scenario: Read the agent guidance

- **WHEN** a coding agent reads the applied `AGENTS.md`
- **THEN** it finds the remote-run, result-recording, and reporting workflow
- **AND** it finds the credential, cost-confirmation, and resource-release rules

### Requirement: Native Linux architecture support

The research template SHALL work with default options on native Linux amd64 and arm64 hosts.

#### Scenario: Verify each supported architecture

- **WHEN** the packaged template is published to a test OCI registry, applied to a clean workspace
  with default options, and opened on each supported native architecture
- **THEN** publication, application, startup, and the default-container assertions succeed

### Requirement: Versioned public distribution

The collection SHALL distribute the research template as
`ghcr.io/hoshiori-dev/devcontainer-templates/research:1.0.0`, with metadata identifying `research`
and version `1.0.0`, and a corresponding source tag `research/v1.0.0`.

#### Scenario: Consume the first public release

- **WHEN** a consumer without registry credentials applies the published reference
- **THEN** the CLI retrieves the template and creates its development-container configuration
