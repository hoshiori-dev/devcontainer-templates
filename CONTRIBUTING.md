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

Template behavior changes use OpenSpec in one draft PR. First submit the proposal, specification
delta, and design where needed. A human maintainer approves that package using `spec:approved`;
trusted automation binds approval to its content. Create tasks and implement after approval.
Ordinary documentation, tooling, and non-behavior dependency updates use the PR acceptance and
validation section.

Keep the active change available while the implementation is reviewed. After the maintainer confirms
completion and explicitly directs archiving, sync and archive inside that PR and run checks again.
The archive check blocks merge until then. See the
[specification contract](.agents/knowledge/spec-workflow.md) for the exact gates and the initial
bootstrap exception.

Use short feature branches from `main`, preferably named `<issue-number>-<description>`. Keep PRs
focused and describe the resulting behavior, validation, and limitations. Commit messages use
English imperative titles of at most 50 characters, starting lowercase without a final period;
optional body lines wrap at 72 characters. AI tools are not credited as commit contributors.

The maintainer performs final review and squash merge. Automatic publication from `main` follows a
merged template version change. Contributors and agents must not force-move release tags or publish
over an existing version.
