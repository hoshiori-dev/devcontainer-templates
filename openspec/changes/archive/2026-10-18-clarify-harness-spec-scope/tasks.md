# Tasks

## 1. Change governance

- [x] 1.1 Synchronize classification, approval, and archive guidance across entrypoints, knowledge,
      project skills, contributor instructions, and OpenSpec context; verify the scenario matrix.
- [x] 1.2 Verify proposal-only validation, approval invalidation, archive records, and unchanged
      delivery-path enforcement with script tests and a disposable OpenSpec fixture.

## 2. Archive validation

- [x] 2.1 Rename the archive workflow and executor, separate waiting from errors, and retain target,
      task, trusted-code, and required-check boundaries; verify workflow and API integration tests.
- [x] 2.2 Verify superseded-run cancellation, event selection, CI aggregation, and synchronized
      documentation with script tests, actionlint, and just check.

## Workflow follow-up

- Mark the verified implementation ready for review, then archive under the maintainer's explicit
  instruction in this conversation, rerun validation, and push the archived result.
- Leave merging to the maintainer; trusted workflow changes take effect after merge into main.
