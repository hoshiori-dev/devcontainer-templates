# Design

## Context

See proposal.md for the incident and intended scope. The current entrypoint, OpenSpec context, and
GitHub skill emphasize template behavior; the specification contract permits small harness work
without defining a semantic boundary. Only `ubuntu-template` has a stable OpenSpec specification.
The existing PR companion check intentionally enforces only `src/` and `test/` paths.

PR #8 already changed archive concurrency and triggers in `a97aeb1`. It is now a draft awaiting
review of this package. Those commits are prior implementation, not prior specification approval.

## Goals / Non-Goals

**Goals:** Make classification discoverable before implementation, support proposal-only changes
using the installed OpenSpec schema, and retain human approval and archive control.

**Non-Goals:** Broaden path-based semantic CI gates, alter template behavior, rewrite merged
history, or change approval trust, CI aggregation, edited events, or release permissions.

## Decisions

### One classification source

Keep the decision table in the specification workflow knowledge file. The entrypoint routes all
non-exempt changes there; custom skills apply it before tasks or implementation. Update the PR
instructions, contributor guide, authority wording, and OpenSpec context to agree with that source.

Classify by contractual effect rather than directory names or patch size. Pure typo, formatting, and
routine dependency-reference updates are the only complete exemptions outside delivery paths. Mixed
changes use the strongest applicable category. This is a manual review decision, not a new semantic
scanner that attempts to infer intent from changed files.

### Reuse OpenSpec's proposal-only support

Use the existing `spec-driven` schema. A repair restoring an existing contract or a behavior-
preserving refactor sets `skip_specs: true` in its change metadata and includes a proposal plus
optional design. The proposal explains the unchanged contract and validation. Do not fabricate spec
deltas to satisfy validation or introduce a separate workflow/schema.

After maintainer approval and `spec:approved`, create tasks for implementation and verification.
Tasks are execution records, not additional pre-approval planning requirements. Preserve their
existing completed-task archive check for both planning paths. Proposal-only archive retains
metadata and records without producing stable specs. Optional design follows official artifact
instructions; its absence is not a reason to invent design work.

The existing stronger `src/` and `test/` companion rule takes precedence over proposal-only and
complete-exemption categories: every such PR requires a proposal, spec edit, and maintainer approval
with `spec:approved` before tasks or implementation, including typos, formatting, and routine
dependency updates. Keep that override explicit in every classification route.

### Preserve the approval package mechanism

Approval fingerprints already cover proposal, design, and spec contents while ignoring tasks and
normalizing archive paths. Proposal-only packages therefore have a meaningful fingerprint without
adding a new approval identity. Classification and the reason for omitting specs live in the
proposal, so changing those decisions changes the approved package.

Use fixtures after approval to verify proposal-only validation, approval invalidation, completed-
task archive checks, and unchanged path-based enforcement. Keep label presence an agent operating
requirement while required merge checks remain independent of approval evidence.

### Review the previously implemented concurrency change

The `pr-validation` delta records PR #8's intended behavior. Retain its workflow-and-PR group,
`cancel-in-progress: true`, and removal of draft-state triggers. Keep existing CI
failure/cancellation aggregation, edited-event handling, trusted execution, and approval-record
workflow sequencing. Review the existing implementation against the approved scenarios before
returning the PR to ready.

## Risks / Trade-offs

- Manual classification can drift: keep one decision table and verify it with independent readers
  using contract changes, repairs, refactors, exemptions, mixed PRs, and delivery-path overrides.
- Tool status may still show optional design as missing: follow its conditional instructions and
  verify proposal-only operation with disposable fixtures rather than treating every file as
  mandatory.
- Generic OpenSpec skills offer tasks before approval: project instructions explicitly stop there.
- Older exception wording exists in PR #8 commits: the final PR description must explain the
  correction and link this package rather than retaining its original exemption claim.

## Migration Plan

Publish this package in the draft PR and obtain maintainer approval plus `spec:approved`. Then
update the routing and guidance together, validate both planning paths and the existing concurrency
change, and keep the change active for review. Archive and sync stable specifications only after
explicit completion and archive instructions; leave final merge to the maintainer.
