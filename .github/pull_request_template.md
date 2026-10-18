## Problem

Describe the problem and link its issue with a closing keyword when applicable.

## Changes

Describe the resulting behavior and any deliberate limits.

## Validation

List commands, results, and any checks that could not run.

## Specification

For every PR changing `src/` or `test/`, link the OpenSpec `spec.md` added or modified in this PR.
This includes template documentation, metadata, and tests; small changes in these directories are
not exempt.

Only PRs with no changes under `src/` or `test/` may omit specification changes. For a small
management, harness, documentation, or dependency update, explain why it fits existing contracts.

For template behavior changes, obtain maintainer approval and the `spec:approved` label before
creating tasks or implementing. The maintainer must add this label to mark the package approved;
GitHub does not enforce its presence as a required merge check. Keep the PR draft until the approved
package is implemented. After validation, request human acceptance and archive only when explicitly
instructed. Split PRs may carry active changes into feature branches; the final PR into `main` must
archive them.
