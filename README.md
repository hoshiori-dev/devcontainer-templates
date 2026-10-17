# Dev Container Templates

[简体中文](README.zh.md)

Dev Container Templates maintained by hoshiori-dev. Templates provide a starting `.devcontainer`
configuration that you can apply to your own project.

## Templates

<!-- templates:start -->

| Template                       | Version | Description                                                               |
| ------------------------------ | ------- | ------------------------------------------------------------------------- |
| [Ubuntu](src/ubuntu/README.md) | 1.0.0   | A minimal Ubuntu 24.04 development container with a non-root vscode user. |

<!-- templates:end -->

## Use a template

Once the first release has been published and its GHCR package is public, use **Dev Containers: Add
Dev Container Configuration Files...** in VS Code, or apply the Ubuntu template with the Dev
Container CLI:

```sh
devcontainer templates apply --workspace-folder . \
  --template-id ghcr.io/hoshiori-dev/devcontainer-templates/ubuntu:1.0.0
```

Review the generated configuration, then use **Dev Containers: Reopen in Container**. The
repository's own `.devcontainer/` is for developing this collection; each consumer template lives
under `src/`.

## Develop and contribute

Open this repository in its development container, then run `just check`. `just test ubuntu` runs a
real container test through a temporary OCI registry; it requires a Docker-capable Linux host. CI
covers native amd64 and arm64.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the specification and PR workflow,
[AGENTS.md](AGENTS.md) for agent instructions, and [SECURITY.md](SECURITY.md) for private
vulnerability reporting. Templates are distributed through GHCR after a maintainer merges a version
change. Publication and anonymous package access must be verified before a release is considered
consumable.

## References

The
[template specification](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-templates.md)
and
[distribution specification](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-templates-distribution.md)
define the format. This collection uses the
[Dev Container CLI](https://github.com/devcontainers/cli) and
[Dev Containers CI](https://github.com/devcontainers/ci).

Licensed under [Apache-2.0](LICENSE).
