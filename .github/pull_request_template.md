## Problem

Describe the problem and link its issue with a closing keyword when applicable.

## Changes

Describe the resulting behavior and any deliberate limits.

## Validation

List commands, results, and any checks that could not run.

## Specification

Link the OpenSpec change and its planning package. Every `src/` or `test/` edit requires a proposal
and an added or modified `spec.md`, including typos, formatting, dependencies, and test repairs.
Delivery or harness contract changes also require proposal and spec deltas; add design when needed.

Outside `src/` and `test/`, fixes restoring existing contracts and behavior-preserving refactors
require a proposal and optional design with `skip_specs: true`. Only pure typo corrections,
formatting, and routine dependency-reference updates outside these directories may omit OpenSpec
files entirely; explain that exemption here. Mixed changes follow the strongest applicable path.

For all non-exempt changes, obtain maintainer approval and the maintainer-added `spec:approved`
label before tasks or implementation. The label is required by the workflow, although it is not a
required merge check. Keep the PR draft until the approved package is implemented. After validation,
request human acceptance; archive only when explicitly instructed. Split PRs may carry active
changes into feature branches; the final PR into `main` must archive them. Successful
`awaiting-archive` indicates this normal waiting stage, while `spec-archived` remains pending.
