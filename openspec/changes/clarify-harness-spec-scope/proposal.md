# Proposal

## Why

PR #8 treated changes to workflow triggers and cancellation as exempt management work because the
specification routes emphasize templates. The repository needs an explicit distinction between
contract changes, implementation-only changes, and the few changes that need no planning files.

## What Changes

- Require proposal and specification deltas for changes to delivery or harness contracts, including
  triggers, concurrency, cancellation, checks, authority, approval, and publication behavior.
- Require proposal and optional design for fixes that restore an existing contract and for
  behavior-preserving refactors. Use OpenSpec's `skip_specs: true` for these cases.
- Allow complete exemption only for pure typo fixes, formatting, and routine dependency-reference
  updates outside `src/` and `test/`. Every PR changing either directory requires a full proposal,
  specification edit, and maintainer approval with `spec:approved`, including otherwise exempt
  edits.
- Require human approval and `spec:approved` for both planning paths before tasks or implementation.
  Keep post-approval tasks as execution records and archive only on explicit human instruction.
- Route applicable work through the specification contract from the entrypoint, project skills,
  contributor guidance, and OpenSpec context. Review classification by impact rather than line
  count.
- Cover PR #8's per-PR archive cancellation and removal of draft-state triggers with a
  specification. Retain CI gate failure handling, edited events, trusted execution, and
  approval-record sequencing.
- Treat an unarchived change as a normal waiting state: report successful `awaiting-archive` while
  withholding the required `spec-archived` success. Actual execution errors remain failures.
  Preserve feature-branch exceptions and completed-task requirements.

## Capabilities

### New Capabilities

- `change-governance`: classification, planning artifacts, human approval, and archive lifecycle.
- `pr-validation`: archive-check waiting states, cancellation, and event selection for pull
  requests.

### Modified Capabilities

None. The existing `ubuntu-template` requirements remain unchanged.

## Impact

Agent entrypoints, conditional knowledge, custom workflow skills, contributing and PR instructions,
and OpenSpec configuration will need synchronization after approval. Validation must exercise
proposal-only changes without extending semantic hard gates beyond the existing path-based checks.

PR #8 already contains implementation commit `a97aeb1`, created before these planning artifacts due
to an incorrect exemption decision. This proposal records that sequence; it does not claim earlier
specification approval. The PR is returned to draft for review. No further implementation or tasks
will be added until a maintainer approves this package and adds `spec:approved`.
