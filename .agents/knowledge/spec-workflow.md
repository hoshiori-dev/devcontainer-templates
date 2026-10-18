# Specification workflow

Read before changing template behavior, generating OpenSpec artifacts, reviewing approval, syncing
specs, or archiving. This file owns approval and lifecycle; OpenSpec owns artifact format and
behavior requirements.

## Sources and scope

Use OpenSpec's `spec-driven` schema with English artifacts. Active proposals live in
`openspec/changes/<change>/`; stable requirements live in `openspec/specs/` after archive and sync.
Use a descriptive kebab-case change name; link it from the PR and Issue. Specifications own what,
why, and acceptance. Issues own assignment, priority, status, and links. Link acceptance scenarios
rather than copying them into Issues.

Every PR changing `src/` or `test/` must add or modify an OpenSpec `spec.md`, even for small
template metadata, documentation, or test edits. `just pr-check <base>` checks this against the
actual target branch. Stable specs and active or archived change deltas qualify; proposal, design,
tasks, deletions, and unchanged spec renames do not. Maintainers judge whether the specification
covers the change; automation does not compare requirement meaning or require an archived delta for
stable spec edits.

For new or changed template behavior, prepare a proposal and delta spec before implementation. Only
PRs with no changes under `src/` or `test/` may omit specification changes. Small management,
harness, knowledge typo, and dependency updates outside these directories can use PR discussion and
validation without a spec when they remain consistent with existing contracts. Discuss substantial
changes to those contracts with the maintainer first. Bot PRs follow the same path-based rule as
other PRs.

Large work may use stacked PRs targeting a short-lived feature branch. Each PR changing `src/` or
`test/` still includes a specification edit relative to its own target. Active changes may merge
into feature branches; the final PR into `main` carries the complete change and archive.

## Approval gates

1. Open a draft PR containing proposal, delta specifications, and design when the approach changes
   structure, interfaces, dependencies, or has meaningful options. Discuss outstanding questions and
   reconcile the committed package.
2. A human maintainer approves in the discussion and must add `spec:approved` to mark the package
   approved. Agents wait for maintainer approval and this label before creating tasks or
   implementing. Trusted automation records the actor, PR commit, and approval-package fingerprint.
   Proposal, design, or delta changes invalidate approval; implementation-only commits preserve it.
   Approval evidence is a 90-day Actions artifact from a successful trusted approval workflow run;
   expiration requires a maintainer to reapply the label. Records also require the run's workflow
   definition to match the current default branch; workflow changes can require reapplying the
   label. Archive path normalization and task changes preserve the package identity. A label alone,
   contributor-supplied comment, or approval by the implementing agent is not proof of a tracked
   approval. Before recording a new approval, automation requires the current PR head to match the
   label event's head. If a push races that event, review the current commit and reapply the label.
   GitHub does not enforce the label or approval record as required merge checks. This does not
   waive the operating requirement: maintainers resolve missing or stale approval labels during
   review, and agents wait for renewed approval before dependent work.
3. Only after approval, create tasks and implement. Official generated skills may offer all
   artifacts at once; stop before tasks to honor this project gate.
4. Verify implementation, reconcile tasks and PR discussion, and mark ready for human review while
   the change remains active. The archive gate blocks merging into `main` while active change files
   remain, including in drafts.
5. After the maintainer explicitly confirms completion and directs archive, the branch holder syncs
   and archives in the final PR into `main`, reruns checks, and reports the resulting revision.
   Automation never performs archive. New behavior or package changes return to the relevant gate;
   do not reuse an approval for changed work. The automatic archive check validates file placement
   and completed tasks only. It does not authenticate an archive instruction. The branch holder must
   obtain that instruction in the PR discussion, and the maintainer checks it during final review
   before merging.
6. The maintainer performs final review and merges. No independent second account approval is
   required in this single-maintainer repository.

Use the official OpenSpec operation skill and installed `--help` for commands. Before running any
apply, sync, or archive command, check its human gate above.

## Initial bootstrap exception

The user explicitly approved the complete harness and Ubuntu plan on 2026-10-17 and requested
implementation. `bootstrap-ubuntu` records that initial package and may create tasks and implement
under this one-time approval. Record that evidence in the initial draft PR; it does not confer agent
label approval, archive, merge, or manual release authority. The initial PR could not rely on
unmerged privileged workflows as trusted approval evidence. Label tracking became available after
the initial harness was human-merged. The maintainer confirmed completion and directed archive on
2026-10-18. The approved record is in `openspec/changes/archive/2026-10-18-bootstrap-ubuntu/`; merge
remains a human action.
