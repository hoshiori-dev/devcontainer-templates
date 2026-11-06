# Spec Delta

## Purpose

Define which Docker resources a template container test owns and how it removes them, so local and
CI runs leave no leftovers and never remove resources that existed before the run or that other
containers still use.

## ADDED Requirements

### Requirement: Run-owned named volume cleanup

When a template container test that recorded its volume snapshot ends, it SHALL remove every named
volume that a container owned by the run mounts, that did not exist when the run started, and that
no container outside the run still mounts. It SHALL remove no other volume.

#### Scenario: Template with named volumes

- **WHEN** a test runs a template whose configuration or Features mount named volumes
- **THEN** after the test ends, none of the named volumes created for that run remain

#### Scenario: Pre-existing volume

- **WHEN** a container owned by the run mounts a named volume that existed before the run started
- **THEN** the test leaves that volume in place

#### Scenario: Concurrent runs

- **WHEN** two test runs overlap
- **THEN** each run removes only volumes mounted by its own containers
- **AND** a volume still mounted by the other run's container is left in place

### Requirement: Cleanup on every outcome

The container test SHALL perform its resource cleanup when the run succeeds, fails, or is cancelled.

#### Scenario: Failed or cancelled run

- **WHEN** publication, application, startup, or an assertion fails, or the run receives SIGINT or
  SIGTERM after its containers start
- **THEN** the run's containers and their run-created named volumes are removed
- **AND** the test still reports the original failure, together with any cleanup error
