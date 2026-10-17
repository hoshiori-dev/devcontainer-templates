## ADDED Requirements

### Requirement: Minimal Ubuntu development environment

The Ubuntu template SHALL provide an Ubuntu 24.04 development container using the official Dev
Containers Ubuntu image and the non-root `vscode` remote user. It SHALL expose no template options
and SHALL add no language tooling beyond the selected base image.

#### Scenario: Apply and open the initial template

- **WHEN** a consumer applies version `1.0.0` of the `ubuntu` template to an empty workspace and
  starts its development container
- **THEN** `/etc/os-release` identifies Ubuntu version `24.04`
- **AND** commands run as user `vscode` with a nonzero UID
- **AND** application requires no option values

### Requirement: Native Linux architecture support

The Ubuntu template SHALL work on native Linux amd64 and arm64 hosts.

#### Scenario: Verify each supported architecture

- **WHEN** the packaged template is published to a test OCI registry, applied to a clean workspace,
  and opened on each supported native architecture
- **THEN** publication, application, startup, and Ubuntu/user assertions succeed

### Requirement: Versioned public distribution

The collection SHALL distribute the Ubuntu template as
`ghcr.io/hoshiori-dev/devcontainer-templates/ubuntu:1.0.0`, with metadata identifying `ubuntu` and
version `1.0.0`, and a corresponding source tag `ubuntu/v1.0.0`. The published template SHALL be
anonymously consumable after public package visibility has been verified.

#### Scenario: Consume the first public release

- **WHEN** a consumer without registry credentials applies the published reference
- **THEN** the CLI retrieves the template and creates its development-container configuration
- **AND** the resulting container satisfies the Ubuntu and user requirements
