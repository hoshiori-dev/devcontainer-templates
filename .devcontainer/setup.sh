#!/usr/bin/env bash
set -euo pipefail

npm install --global @devcontainers/cli@latest
pre-commit install --install-hooks
