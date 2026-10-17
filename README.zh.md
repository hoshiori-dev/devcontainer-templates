# Dev Container Templates

[English](README.md)

hoshiori-dev 维护的 Dev Container Templates。模板提供初始 `.devcontainer` 配置，
可以应用到你自己的项目。

## 模板

<!-- templates:start -->

| 模板                           | 版本  | 描述                                                                      |
| ------------------------------ | ----- | ------------------------------------------------------------------------- |
| [Ubuntu](src/ubuntu/README.md) | 1.0.0 | A minimal Ubuntu 24.04 development container with a non-root vscode user. |

<!-- templates:end -->

## 使用模板

首次发布完成并且 GHCR 包设为公开后，可以在 VS Code 中运行 **Dev Containers: Add Dev Container
Configuration Files...**，或使用 Dev Container CLI：

```sh
devcontainer templates apply --workspace-folder . \
  --template-id ghcr.io/hoshiori-dev/devcontainer-templates/ubuntu:1.0.0
```

检查生成的配置，再运行 **Dev Containers: Reopen in Container**。 本仓库根目录的 `.devcontainer/`
用于开发这个模板集合；供使用者应用的模板位于 `src/`。

## 开发和贡献

在本仓库的开发容器中运行 `just check`。`just test ubuntu` 通过临时 OCI registry
测试打包、应用和实际容器行为，需要能够运行 Docker 的 Linux 主机。 CI 分别在原生 amd64 和 arm64
runner 上测试。

贡献流程见 [CONTRIBUTING.md](CONTRIBUTING.md)，代理入口见 [AGENTS.md](AGENTS.md)， 漏洞报告方式见
[SECURITY.md](SECURITY.md)。维护者合并模板版本变更后，自动化发布到 GHCR。
发布后需要验证匿名访问，才能确认使用者可以拉取模板。

## 参考

[模板规范](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-templates.md)和
[分发规范](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-templates-distribution.md)
定义模板格式。本仓库使用 [Dev Container CLI](https://github.com/devcontainers/cli) 和
[Dev Containers CI](https://github.com/devcontainers/ci)。

采用 [Apache-2.0](LICENSE) 许可证。
