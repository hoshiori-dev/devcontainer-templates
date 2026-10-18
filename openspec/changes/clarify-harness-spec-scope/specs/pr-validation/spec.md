# Spec Delta

## Purpose

Define observable pull request validation behavior so runner use can be reduced without weakening
merge checks, changing approval-record sequencing, or executing untrusted code with write access.

## ADDED Requirements

### Requirement: Superseded archive validation

The archive workflow MUST group runs by workflow and PR number and cancel an in-progress run when
another run enters the same group. Different PRs and different workflows MUST remain isolated.

#### Scenario: New run for the same PR

- **WHEN** an archive run is active and an update starts another archive run for that PR
- **THEN** the older run is cancelled and the replacement evaluates the current PR

#### Scenario: Independent pull requests

- **WHEN** archive checks run for different PRs
- **THEN** starting one does not cancel the other

### Requirement: Relevant archive events

Archive checks MUST run on opened, synchronize, reopened, and edited PR events. Draft/ready
transitions alone MUST NOT trigger archive validation. The archive requirement MUST depend on the
target branch and change files, including in draft PRs, rather than draft status.

#### Scenario: Draft transition

- **WHEN** a PR changes only between draft and ready states
- **THEN** that transition starts no archive run

#### Scenario: Target branch changes

- **WHEN** an edited event retargets a PR
- **THEN** archive validation evaluates the actual target
- **AND** active changes block entry into `main` but may remain in a feature-target PR

### Requirement: Archive waiting state

An unarchived change targeting `main` MUST produce a successful `awaiting-archive` job instead of an
archive failure. The required `spec-archived` check MUST remain unsatisfied until archive and
completed-task conditions pass. Archive verdicts MUST distinguish waiting from execution errors;
errors MUST fail validation rather than report waiting or success.

#### Scenario: Normal review before archive

- **WHEN** a PR into `main` contains an active change and archive validation executes successfully
- **THEN** the run reports `awaiting-archive` successfully without satisfying `spec-archived`
- **AND** GitHub still blocks merging until the required archive check is satisfied

#### Scenario: Archive requirements satisfied

- **WHEN** all changes covered by the archive gate are archived with completed tasks
- **THEN** validation reports a successful `spec-archived` check

#### Scenario: Split pull request

- **WHEN** a PR targets a feature branch and carries an active change
- **THEN** archive validation reports `spec-archived` successfully under the split-PR rule

#### Scenario: Archive checker failure

- **WHEN** loading the checker, reading its inputs, or executing it fails
- **THEN** validation fails instead of reporting `awaiting-archive` or archive success

### Requirement: Preserved validation boundaries

CI aggregation MUST continue rejecting failed, cancelled, or unexpectedly skipped required upstream
jobs. Approval-record workflows MUST preserve in-progress record creation and artifact upload.
Privileged archive and approval code MUST execute trusted default-branch code and treat PR content
as API data. Approval labels MUST NOT become required merge checks.

#### Scenario: Failed upstream validation

- **WHEN** a required validation fails or is cancelled
- **THEN** the CI gate does not report success

#### Scenario: In-progress approval record

- **WHEN** a PR update arrives during approval recording
- **THEN** this change does not cancel the in-progress approval record workflow
