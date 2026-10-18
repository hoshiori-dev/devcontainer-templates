# Harness maintenance

Read when changing harness files, commands, tool versions, or workflows, or when performing the
periodic consistency review. The changing source's PR author owns updating its dependents in the
same PR. Scripts and workflows own executable facts; knowledge files own operating conventions;
OpenSpec owns delivery and harness behavior contracts.

Management code serves developers. Rely on the configured workspace, installed Features, and tool
errors instead of adding directory recovery, fallback paths, or duplicate checks for controlled
inputs. Validate repository contracts and external trust boundaries; do not hide unexpected failures
or add general compatibility layers for environments this project does not use.

Development container Features use their default versions; CI tools follow the latest stable
releases. Features supply the container tools; `.devcontainer/setup.sh` installs the CLI and hooks.
The composite Action in `.github/actions/setup-tools/` owns CI tool installation, using setup
Actions for Node, Deno, and uv and inline Shell commands for the remaining tools. CI records actual
tool versions so compatibility failures can be traced to the installed releases. Do not introduce a
central version list or silently downgrade on an upgrade failure. Fix or discuss the
incompatibility. External Actions remain pinned to reviewed commit SHAs.

Betterleaks setup resolves one stable release and verifies its architecture-specific archive with
that release's published SHA-256 checksum. This detects corrupted downloads but still trusts the
upstream release account. npm and uv also trust upstream dependencies. Latest tools and disabled
Deno lockfiles deliberately do not provide a frozen dependency graph.

Deno entrypoints are executable scripts whose shebangs own their runtime permissions. Invoke them
directly from recipes and workflows; changing an entrypoint's capabilities requires updating its
shebang. Pure test files need no permissions; resource-using tests declare their own. Run the suite
through `just scripts-check`. Deno lockfiles are disabled; imports retain explicit dependency
versions.

| Trigger/source                                   | Update and verify                                                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Template metadata, NOTES, or published files     | Increment the affected version, regenerate docs, run docs-check, compare the spec, and run its real container test.   |
| Test or packaging script and CLI flags           | Update testing knowledge and template skill; run script tests and full affected selection.                            |
| justfile or tool setup                           | Update entrypoint and contributing commands; verify documented commands in the development container.                 |
| GitHub events, checks, approval, or release code | Update workflow and spec contracts, GitHub skill, and platform checklist; test trust boundaries and negative cases.   |
| Knowledge or skill procedure                     | Check each referenced path/command against source and its trigger in AGENTS.md; update Claude links if a skill moves. |
| Root user instructions                           | Review the English and Chinese README together; regenerate only the marked template indexes.                          |
| Stable behavior requirement                      | Update the matching active OpenSpec change and assertions; preserve the approval gate for changed packages.           |

After every tenth merged PR that changes `src/`, review the PR range since the last maintenance
review. The maintainer or agent preparing that tenth PR opens a Task Issue recording the range,
checks, and keep/update/remove findings. Count merged PRs through GitHub's API; skip none merely
because a PR lacks an area label.

For that review, follow every entrypoint route, resolve local links and Claude symlinks, run
documented static commands, compare skill procedures with scripts, check that workflow permissions
and required-check names agree, and find duplicate, stale, unreachable, or unjustified guidance.
Keep the entrypoint near 100 lines. Report findings before destructive cleanup. Record "no changes
needed" when true.

Use one implementing agent by default. Independent readers may verify artifact instructions in a
clean context when explicitly arranged for a harness review; ordinary tasks do not require permanent
planner/reviewer agent roles. Guidance changes follow observed source changes and review; agent
failures produce findings rather than unattended self-modification or expanded autonomy.

## Architecture choices

Environment and quality feedback are substantial because published templates must work on two
architectures. Information and workflow guidance stay conditional and compact because a single
maintainer reviews work. Specification and repository safety checks are explicit because OCI
distribution and privileged GitHub events cross trust boundaries. Human gates own approval and
integration; automation owns repeatable checks. Synchronization rows above and the ten-PR review
control drift without a separate maintenance service.

## OpenSpec initialization record

On 2026-10-17, OpenSpec 1.14.3 initialized the `spec-driven` layout and the Codex and Claude core
operation sets. Inventory before initialization contained no OpenSpec files or agent entrypoints.
Retain the generated operation skills and Claude commands as tool-owned files; their platform
invocation wording differs. The generated config is adapted to project scope and human gates. Custom
project skills have Claude symlinks to their authoritative `.agents/skills/` copies. When updating
OpenSpec, inventory and diff all generated paths and reconcile the project approval gates before
accepting regenerated content.
