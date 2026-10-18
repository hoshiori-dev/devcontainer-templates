# Dev Container Templates

This public repository develops and distributes Dev Container Templates. Use this file as the shared
entrypoint for agents; load detail only when its condition below applies. Communicate with the user
in their requested language. Repository documents, code comments, and commit messages use English
unless the user requests another language. The root README also has a Chinese translation.

## Project map

- `src/<id>/`: published template metadata, container files, and notes.
- `test/<id>/`: container assertions for that template.
- `scripts/`: project-owned validation and GitHub management code.
- `.github/`: intake forms, PR conventions, checks, and release automation.
- `.devcontainer/`: this repository's development environment.
- `openspec/`: behavior specifications and active change records.
- `.agents/knowledge/`: conditional conventions and operating contracts.
- `.agents/skills/`: recurring project procedures and OpenSpec operations.

## Before changing work

1. Inspect the working tree and preserve existing user changes.
2. Read the applicable routes below before selecting commands or editing.
3. Keep changes within the request. Report unrelated findings separately.
4. Use maintained metadata, scripts, and specifications as the source of truth.
5. Verify tool syntax from installed help or official documentation when unsure.

## Load by task

| When                                                                                 | Read                                                                                                                                                                                |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adding or changing a published template                                              | [.agents/skills/template-development/SKILL.md](.agents/skills/template-development/SKILL.md) and [.agents/knowledge/templates.md](.agents/knowledge/templates.md)                   |
| Running, changing, or debugging validation                                           | [.agents/knowledge/testing.md](.agents/knowledge/testing.md)                                                                                                                        |
| Classifying work, changing contracts, fixing, refactoring, or archiving              | [.agents/knowledge/spec-workflow.md](.agents/knowledge/spec-workflow.md), then the relevant official OpenSpec skill in `.agents/skills/openspec-*/`                                 |
| Creating an Issue, branch, commit, PR, or release record                             | [.agents/skills/github-project-workflow/SKILL.md](.agents/skills/github-project-workflow/SKILL.md) and [.agents/knowledge/github-workflow.md](.agents/knowledge/github-workflow.md) |
| Pushing, marking ready, requesting review, changing settings, or discussing autonomy | [.agents/knowledge/authority.md](.agents/knowledge/authority.md)                                                                                                                    |
| Configuring repository settings or verifying publication                             | [.agents/knowledge/platform-operations.md](.agents/knowledge/platform-operations.md)                                                                                                |
| Changing harness files, commands, tool versions, or CI, or reviewing drift           | [.agents/knowledge/maintenance.md](.agents/knowledge/maintenance.md)                                                                                                                |
| Contributing or reporting a vulnerability                                            | [CONTRIBUTING.md](CONTRIBUTING.md) or [SECURITY.md](SECURITY.md)                                                                                                                    |

## Core boundaries

- An agent may implement, validate, commit, push, create Issues and PRs, and mark verified work
  ready for human review under the authority contract.
- A maintainer approves specifications and merges. Agents never approve their own specifications,
  merge, manually release, or expand their own permissions.
- Read the specification contract before implementation. Every `src/` or `test/` PR needs a full
  proposal and spec edit; delivery and harness contract changes need spec deltas too. Other repairs
  and behavior-preserving refactors need a proposal, with `skip_specs: true`. Only pure typos,
  formatting, and routine dependency updates outside delivery paths are completely exempt.
- All non-exempt packages require human approval and the maintainer-added `spec:approved` label
  before tasks or implementation. Labels assist review; they are not required merge checks.
- Finished spec changes remain active for review. Archive in the final PR into `main` only after the
  maintainer explicitly confirms completion and directs archiving.
- The archive merge check blocks PRs into `main` during that review; feature-branch PRs may carry
  active changes. Successful `awaiting-archive` leaves the required check pending; report this
  expected gate separately from implementation failures.
- Stop dependent work and ask the maintainer when acceptance is unclear, scope expands, required
  checks cannot run, or an authority boundary is reached.
- Keep credentials and personal data out of commits, logs, examples, and reports. Use secret storage
  for credentials and private reporting for vulnerabilities.
- Privileged automation executes trusted default-branch code; PR content is data. Never execute fork
  content in a workflow with write permissions or secrets.

## Validation entrypoints

Run `just --list` for exact recipe arguments. The repository commands are:

- `just check`: static validation, PR specification changes, specs, documentation, and script tests.
- `just pr-check <base>`: check specification changes against the actual PR target.
- `just test ubuntu`: registry publish/apply and real container assertions.
- `just affected`: print template IDs affected by the comparison base.
- `just docs` / `just docs-check`: generate / verify template documentation.
- `just package`: validate distributable template archives.
- `just labels-check`: compare GitHub labels with repository definitions.

Run the checks relevant to a change and report results with the tested revision. A passing static
check does not establish container or remote publication success.

## Keep this map current

- When paths, recipe arguments, or scripts change, update their routes and commands here and follow
  the corresponding synchronization row in the maintenance guide.
- When template metadata or NOTES change, regenerate docs and review both root README languages for
  hand-written instructions that need the same change.
- When workflow, approval, or release behavior changes, update the matching knowledge contract and
  procedure in the same PR and verify their tests.
- After every tenth merged template PR, run the maintenance review described in
  `.agents/knowledge/maintenance.md`; record the PR range and findings in an Issue.
