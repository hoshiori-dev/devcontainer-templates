# Git and GitHub workflow

Read when creating branches, Issues, commits, PRs, or release records. This file owns collaboration
conventions; authority.md owns delegated actions, spec-workflow.md owns behavior approval, and
workflow YAML owns execution details.

Use GitHub Flow: `main` is the only long-lived branch. Prefer `<issue-number>-<short-description>`
branches; use a descriptive branch when no Issue exists. One PR addresses one coherent outcome.
Squash merge, then delete its branch. Template source tags use the naming contract in templates.md.

Use Bug, Template, or Task intake forms and the repository's small type and area label set. Create
an Epic only when several Issues need shared coordination. Use Issues and PR links for tracking; do
not introduce Projects, sprint schedules, fixed milestones, organization issue types, or
organization settings by default.

Commits use English imperative titles, lowercase initial text, no final period, and at most 50
characters; wrap optional body lines at 72 characters. Do not add AI attribution. Inspect staged
content and exclude secrets, generated test output, and unrelated user changes before committing.
Stage explicit paths.

Open a draft PR early. Its description names the user-visible result, linked Issue and spec change
where applicable, checks with evidence, and remaining limitations. The PR template is a writing aid;
title length and fixed body sections are not merge checks. Keep the description current as scope
settles. For spec work, ready means implementation is reviewable, while the archive check blocks
merge into `main` until active changes are archived and tasks are complete. Split PRs may target a
short-lived feature branch and carry active changes. Human authorization to archive is checked
during final review, not proven by that check.

PR CI uses read-only credentials and tests contributor content without repository secrets.
Privileged archive and approval jobs execute only trusted default-branch code and read contributor
files through the API. A workflow must never checkout PR-head content under `pull_request_target`
with write credentials.

A maintainer's merge of a template version change authorizes automatic publication from that exact
`main` commit. Publication creates per-template source tags and provenance after registry
distribution. Reruns reuse existing published versions; fixes use a higher version. Publication
failure is not permission to force-move tags. Existing versions reused by the current publication
are verified against source, Git-style executable flags, and attestations bound to their original
source-tag commits before publication can proceed.
