# Design

## Context

`testTemplate` in `scripts/template.ts` labels every container it starts with a run-specific
`devcontainer-templates.test=<token>` label and, in its `finally` block, removes those containers
with `docker rm -fv`. Named volumes mounted through `devcontainer.json` or Features are created
implicitly by `docker run --mount`, carry no labels, and survive container removal. Their names
usually include `${devcontainerId}`, which the Dev Container CLI derives from the run's unique ID
labels, but a template may also mount a fixed name.

## Goals / Non-Goals

**Goals:**

- Remove the named volumes a run created, without labels on the volumes themselves.
- Never remove a volume that existed before the run, that the run's containers did not mount, or
  that a container outside the run still uses.

**Non-Goals:**

- Cleaning images built by the Dev Container CLI, or volumes left by earlier runs.

## Decisions

### Snapshot plus mount ownership

Before the run starts any container, record the names of existing volumes. In cleanup, before
removing containers, read each owned container's mounts and collect the names of `volume` mounts.
After `docker rm -fv`, remove the collected names that were absent from the snapshot. A pure helper
selects those names from the mount data and the snapshot, so script tests can cover it without
Docker.

Alternatives: removing volumes by name pattern (`*-${devcontainerId}`) depends on each Feature's
naming and cannot see fixed names; labeling volumes is impossible for volumes Docker creates
implicitly from mounts; removing all volumes created during the run's time window would catch other
concurrent runs.

### Failure handling

Volume removal runs inside the existing `finally` block after container removal, so it applies to
success, failure, and cancellation. If the snapshot was not completed, cleanup removes no volumes.
When Docker refuses to remove a selected volume because a container outside the run still uses it,
cleanup skips that volume; acting on Docker's refusal, rather than checking first, leaves no window
for another container to start using it in between. Any other removal failure is an error naming the
volume.

A cleanup error never replaces the test's own failure: when the run already failed, cleanup logs its
error and the original failure is rethrown; when the run succeeded, the cleanup error fails it.

## Risks / Trade-offs

- [Another process creates a fixed-name volume after the snapshot, and the run's container mounts it
  too] → If no other container uses it at cleanup, the run treats it as its own and removes it. Only
  a template that mounts a fixed name shared with another live process can hit this, and that
  template already shares state with it.
- [Two overlapping runs of a template that mounts a fixed name] → If both snapshots predate the
  volume, the first run to finish skips it and the last removes it. If the second run snapshots
  after the first created it, the second treats it as pre-existing and the first skips it while it
  is in use, so it leaks. Fixed-name volumes in templates are the trigger; the current templates use
  per-container names.
- [Snapshot listing adds one Docker call per run] → Negligible next to image builds.
