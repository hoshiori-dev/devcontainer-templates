# Specification workflow

Read before changing template behavior, generating OpenSpec artifacts, reviewing approval, syncing
specs, or archiving. This file owns approval and lifecycle; OpenSpec owns artifact format and
behavior requirements.

## Sources and scope

Use OpenSpec's `spec-driven` schema with English artifacts. Active proposals live in
`openspec/changes/<change>/`; stable requirements live in `openspec/specs/` after archive and sync.
One combined draft PR carries proposal, implementation, and archive. Use a descriptive kebab-case
change name; link it from the PR and Issue. Specifications own what, why, and acceptance. Issues own
assignment, priority, status, and links. Link acceptance scenarios rather than copying them into
Issues.

Create a delta spec for new or changed template behavior. Ordinary tooling, workflow, documentation,
and dependency updates with no behavior change use the PR's validation and acceptance section
without inventing a template domain.

## Approval gates

1. Open a draft PR containing proposal, delta specifications, and design when the approach changes
   structure, interfaces, dependencies, or has meaningful options. Discuss outstanding questions and
   reconcile the committed package.
2. A human maintainer adds `spec:approved`. Trusted automation records the actor, PR commit, and
   approval-package fingerprint. Proposal, design, or delta changes invalidate approval;
   implementation-only commits preserve it. Approval evidence is a 90-day Actions artifact from a
   successful trusted approval workflow run; expiration requires a maintainer to reapply the label.
   Archive path normalization and task changes preserve the package identity. A label alone,
   contributor-supplied comment, or approval by the implementing agent is not proof.
3. Only after approval, create tasks and implement. Official generated skills may offer all
   artifacts at once; stop before tasks to honor this project gate.
4. Verify implementation, reconcile tasks and PR discussion, and mark ready for human review while
   the change remains active. The archive gate blocks merging.
5. After the maintainer explicitly confirms completion and directs archive, the branch holder syncs
   and archives in that same PR, reruns checks, and reports the resulting revision. Automation never
   performs archive. New behavior or package changes return to the relevant gate; do not reuse an
   approval for changed work.
6. The maintainer performs final review and merges. No independent second account approval is
   required in this single-maintainer repository.

Use the official OpenSpec operation skill and installed `--help` for commands. Before running any
apply, sync, or archive command, check its human gate above.

## Initial bootstrap exception

The user explicitly approved the complete harness and Ubuntu plan on 2026-10-17 and requested
implementation. `bootstrap-ubuntu` records that initial package and may create tasks and implement
under this one-time approval. Record that evidence in the initial draft PR; it does not confer agent
label approval, archive, merge, or manual release authority. The initial PR cannot rely on unmerged
privileged workflows as trusted approval evidence. Normal label-based approval begins after the
initial harness is human-merged. The initial change remains active until the maintainer confirms
completion and explicitly directs archive inside its PR.
