# Harness maintenance

Read when changing harness files, commands, tool versions, or workflows, or when performing the
periodic consistency review. The changing source's PR author owns updating its dependents in the
same PR. Scripts and workflows own executable facts; knowledge files own operating conventions;
OpenSpec owns template behavior.

The development container uses the latest Betterleaks, Deno, OpenSpec and uv releases, with
unconstrained pre-commit and rust-just packages supplied by its Features. Local post-create setup
preserves these tools. `tools.json` pins their CI installations separately; the Dev Container CLI
and Node settings follow their existing pins.

| Trigger/source                                   | Update and verify                                                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Template metadata, NOTES, or published files     | Increment the affected version, regenerate docs, run docs-check, compare the spec, and run its real container test.   |
| Test or packaging script and CLI flags           | Update testing knowledge and template skill; run script tests and full affected selection.                            |
| justfile or tool pins                            | Update entrypoint and contributing commands; verify documented commands in the development container.                 |
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
