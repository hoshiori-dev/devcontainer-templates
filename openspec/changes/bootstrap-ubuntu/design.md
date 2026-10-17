# Design

## Context

The repository starts with a development-container configuration and no released templates. It is a
public GitHub collection maintained by one human, accepting future external contributions. The
user's approved plan supplies the initial specification approval; the initial PR remains subject to
completion review.

## Goals / Non-Goals

Deliver a minimal first template and a durable path from specification through native container
tests to OCI consumption. Keep knowledge conditional and checks shared between local recipes and CI.
Avoid organization settings, scheduled planning machinery, language-specific tools in Ubuntu, and
automatic agent merge.

## Decisions

### Template boundary

Publish only `src/<id>/` template content, independently versioned. Keep the repository's own
development container separate. Ubuntu uses the official Ubuntu 24.04 development image and its
existing non-root `vscode` user, without options or additional language tooling. Assertions execute
in an applied container.

### Distribution and checks

Use the latest stable Dev Container CLI for publish/apply and tar for local packaging. Tests use
isolated local registries and resource names, then assert real container behavior. CI uses native
amd64 and arm64. Generated documentation derives from metadata and NOTES. Release from the exact
merged `main` revision, preserve published versions, and record matching source tags and provenance.
A failed release is repaired by retry or a higher patch version, never by overwriting an existing
published version.

### Approval and trust

One draft PR carries specifications and implementation. Human approval is bound to the approval
package fingerprint; implementation-only commits preserve it. Privileged GitHub events execute
default-branch code and inspect PR files as data. Read-only PR checks can execute contributor
content without repository secrets. The maintainer reviews completion before the branch holder
archives; required checks prevent merging active changes. Agents cannot self-approve or merge.

### Guidance and tracking

A short shared entrypoint routes to conditional knowledge and project procedures. OpenSpec owns
behavior acceptance, while Issues own status and assignment. Tooling changes with no template
behavior change use PR acceptance. Human review and same-PR synchronization keep guidance aligned
with scripts and workflows.

## Risks / Trade-offs

GHCR visibility and GitHub settings may require maintainer permissions. API access failures must be
reported as unresolved settings, not evidence of enforcement. Native architecture and container
checks require suitable runners and Docker; static validation alone cannot certify them.
Repository-owned checks require ongoing maintenance when CLI, registry, or GitHub interfaces change.

## Migration Plan

The initial PR records the user's plan approval as a bootstrap exception. The maintainer confirms
completion, directs archive in that PR, and merges. Enable required checks only after their real job
names have run. Verify first-release anonymous GHCR consumption before announcing it as usable.
There is no existing consumer data to migrate; rollback of a released template uses a new patch
version.

## Open Questions

No design decision remains open. Remote settings that deny access and first publication verification
remain operational acceptance evidence to collect.
