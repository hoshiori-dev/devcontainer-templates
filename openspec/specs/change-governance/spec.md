# change-governance Specification

## Purpose

Define how contributors and agents classify repository changes, prepare reviewable planning
materials, obtain human approval, and retain implementation and archive records.

## Requirements

### Requirement: Classification by contract impact

Contributors MUST classify changes before implementation using their effect on delivery and harness
contracts. Contract changes MUST include a proposal and specification deltas, plus design when
needed. File location outside `src/` and `test/`, low line count, or bot authorship MUST NOT alone
justify exemption.

#### Scenario: Workflow cancellation changes

- **WHEN** a PR changes workflow triggers or concurrency and cancellation behavior
- **THEN** it includes a proposal and specification deltas before further implementation

#### Scenario: Other harness contract changes

- **WHEN** a PR changes permissions, approval, gates, publication, agent operating rules, or command
  interfaces
- **THEN** it follows the contract-change planning path regardless of patch size

### Requirement: Proposal-only implementation changes

Fixes restoring an existing contract and refactors preserving behavior MUST include a proposal and
optional design. They MUST declare `skip_specs: true` and omit specification deltas. The proposal
MUST identify the existing contract or retained behavior and how restoration or preservation will be
verified.

#### Scenario: Restore archive compatibility

- **WHEN** a management fix accepts the existing published tar format without changing requirements
- **THEN** its proposal cites the existing distribution contract and verification evidence
- **AND** no artificial specification delta is required

#### Scenario: Refactor management code

- **WHEN** management code is reorganized without changing its observable contracts
- **THEN** the change contains a proposal describing retained behavior and validation
- **AND** design is added only when needed to explain the approach

### Requirement: Narrow complete exemptions

Complete exemption from OpenSpec change files MUST be limited to pure typo corrections, formatting,
and routine dependency-reference updates outside `src/` and `test/`. A mixed PR MUST follow the
strongest applicable planning path. Routine dependency updates MUST NOT exempt accompanying
implementation or policy changes.

#### Scenario: Automated dependency update

- **WHEN** a bot updates only dependency versions or Action references, makes no changes under
  `src/` or `test/`, and includes no implementation or policy changes
- **THEN** the PR may use the complete exemption

#### Scenario: Small code fix mixed with formatting

- **WHEN** a PR includes formatting and a fix restoring existing management behavior
- **THEN** the PR includes a proposal despite its size

### Requirement: Delivery directory precedence

Every PR changing `src/` or `test/` MUST include a proposal and an added or modified OpenSpec
`spec.md` relative to its actual target, with design when needed. These packages MUST obtain
maintainer approval and the maintainer-added `spec:approved` label before tasks or implementation.
This rule MUST override complete exemptions and proposal-only classification. Existing path-based CI
enforcement MUST remain without adding semantic hard gates for other directories.

#### Scenario: Template documentation typo

- **WHEN** a PR corrects a typo under `src/`
- **THEN** it includes a proposal and specification edit and obtains approval and its label before
  implementation

#### Scenario: Test-only repair

- **WHEN** a PR restores an existing assertion under `test/`
- **THEN** it follows the full proposal, specification, and approval path despite restoring existing
  behavior

### Requirement: Human approval before execution records and implementation

All non-exempt packages, including delivery-directory packages, MUST obtain maintainer approval and
the maintainer-added `spec:approved` label before agents create tasks or implement. Changes to the
approval package MUST return to approval. Label and record automation MUST remain independent of
required merge checks; agents MUST NOT treat that separation as permission to skip approval.

#### Scenario: Proposal-only approval

- **WHEN** a proposal-only change has a maintainer-approved proposal and the approval label
- **THEN** the agent may create tasks and implement without a specification delta

#### Scenario: Missing or withdrawn approval

- **WHEN** approval or its required label is missing, or the planning package changes
- **THEN** the agent waits for maintainer approval of the current package before dependent work

### Requirement: Execution and archive records

After approval, non-exempt changes MUST retain tasks as implementation and verification records,
including proposal-only changes. Archive into `main` MUST require completed tasks and explicit human
completion and archive instructions. Proposal-only archive MUST preserve the proposal, optional
design, and execution records without generating stable requirements.

#### Scenario: Archive a proposal-only change

- **WHEN** a completed proposal-only change is explicitly authorized for archive
- **THEN** its records are archived with `skip_specs: true` and completed tasks
- **AND** stable specifications receive no invented requirement

### Requirement: Reachable classification guidance

The agent entrypoint and project procedures MUST route delivery and harness contract changes,
implementation-only fixes, and refactors to one authoritative classification guide before work. PR
descriptions MUST link their change or justify a permitted complete exemption.

#### Scenario: Harness workflow task

- **WHEN** an agent receives a request to adjust GitHub workflow behavior
- **THEN** its entrypoint and project procedure direct it to the specification contract
