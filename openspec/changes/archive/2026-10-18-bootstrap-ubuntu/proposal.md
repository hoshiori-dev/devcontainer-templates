# Proposal

## Why

The public template repository needs a repeatable development, review, and publication workflow. A
minimal Ubuntu template provides the first real consumer configuration against which that workflow
can be verified.

## What Changes

- Add the first Ubuntu 24.04 template with a non-root development user.
- Validate packaged templates through registry publication, application, and real container
  assertions on native amd64 and arm64.
- Establish progressive agent guidance, GitHub intake and checks, specification approval, generated
  documentation, and per-template GHCR releases.

## Capabilities

### New Capabilities

- `ubuntu-template`: The initial minimal Ubuntu development environment and its supported consumer
  application behavior.

### Modified Capabilities

None; this repository has no existing stable template specifications.

## Impact

Adds published content and tests, repository-owned management scripts, development tooling, public
documentation, agent guidance, OpenSpec, and GitHub automation. Publication requires a maintainer
merge and public GHCR visibility. The user explicitly approved the complete implementation plan on
2026-10-17; the initial approval exception is recorded in the specification contract and must be
linked from the draft PR. Completion review, archive, and merge remain human gates.
