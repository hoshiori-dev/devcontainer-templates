# Contributing

Use a Bug, Template, or Task Issue to describe the problem or desired result. For a small fix, a
focused PR can carry the discussion. Link related work rather than copying specification acceptance
scenarios into an Issue.

## Development

Open the repository in its development container. Run `just --list` to see recipes, `just check` for
static checks, and `just test ubuntu` for a real template test. Container tests require Docker on
Linux. CI tests native amd64 and arm64; report coverage you could not run locally. `just docs`
regenerates template READMEs and root indexes from metadata and NOTES; `just docs-check` detects
stale output.

Keep published template files in `src/<id>/` and their container assertions in `test/<id>/`.
Templates have independent SemVer versions; increment the version when published content changes. Do
not edit generated documentation directly.

## Specifications and review

Every PR changing `src/` or `test/` must include an added or modified OpenSpec `spec.md`. Existing
specs without edits, proposal/design/tasks files alone, and deleted specs do not satisfy this check.
Maintainers review whether the specification covers the implementation.

Start every non-exempt change in a draft PR with an OpenSpec package. Delivery or harness contract
changes need proposal and spec deltas, with design when needed. Fixes restoring existing contracts
and behavior-preserving refactors outside `src/` and `test/` need proposal and optional design, with
`skip_specs: true` and no spec deltas. Every edit under `src/` or `test/` needs a full proposal and
spec edit, including typos, formatting, routine dependencies, and repairs.

Only pure typo corrections, formatting, and routine dependency-reference updates outside those
directories may omit OpenSpec files entirely. Explain this exemption in the PR. Patch size and bot
authorship alone do not justify exemption; mixed changes follow the strongest applicable path.

A human maintainer approves the package in discussion and must add `spec:approved`. Create tasks and
implement only after both approval and label. The label is required by the contribution workflow;
GitHub does not enforce it as a required merge check.

Keep the active change available while the implementation is reviewed. After the maintainer confirms
completion and explicitly directs archiving, sync and archive in the final PR into `main` and rerun
checks. Split PRs may target a short-lived feature branch and carry active changes; each still needs
its own spec edit when changing `src/` or `test/`. The final PR into `main` must archive the change.
The archive check verifies archived files and completed tasks only when targeting `main`. Normal
waiting reports successful `awaiting-archive` with the required `spec-archived` check still pending;
execution errors fail validation. The maintainer verifies the explicit archive instruction during
final review; the check itself cannot prove that authorization. See the
[specification contract](.agents/knowledge/spec-workflow.md) for the exact gates and the initial
bootstrap exception.

Use short feature branches from `main`, preferably named `<issue-number>-<description>`. Keep PRs
focused and describe the resulting behavior, validation, and limitations. Commit messages use
English imperative titles of at most 50 characters, starting lowercase without a final period;
optional body lines wrap at 72 characters. AI tools are not credited as commit contributors.

The maintainer performs final review and squash merge. Automatic publication from `main` follows a
merged template version change. Contributors and agents must not force-move release tags or publish
over an existing version.
