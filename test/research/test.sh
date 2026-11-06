#!/usr/bin/env bash
set -euo pipefail

workspace="$(cd "$(dirname "$0")" && pwd)"
config="$workspace/.devcontainer/devcontainer.json"

# shellcheck source=/dev/null
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 ]]
[[ "$(id -un)" == vscode && "$(id -u)" != 0 ]]
[[ "$(getent passwd vscode | cut -d: -f7)" == */zsh ]]

git --version
git lfs version
quarto --version
colab version
sky --version
uv --version
pre-commit --version
just --version

# Agents and LaTeX are consumer-selected Features.
for absent in latex tlmgr codex claude agy opencode; do
  if command -v "$absent"; then exit 1; fi
done

# The default skypilotExtra is slurm, whose extra dependency is python-hostlist.
"$(dirname "$(readlink -f "$(command -v sky)")")/python" -c 'import hostlist'

for state in .sky .slurm .kube .config/colab-cli; do
  mountpoint -q "$HOME/$state"
  touch "$HOME/$state/.template-test"
  rm "$HOME/$state/.template-test"
done
if grep -q '"bind"' "$config"; then exit 1; fi

for extension in EditorConfig.EditorConfig openai.chatgpt ms-python.python charliermarsh.ruff \
  astral-sh.ty; do
  grep -q "\"$extension\"" "$config"
done

starter="$(mktemp -d)"
trap 'rm -rf "$starter"' EXIT
for file in .pre-commit-config.yaml .editorconfig .github/dependabot.yml AGENTS.md; do
  [[ -f "$workspace/$file" ]]
  mkdir -p "$starter/$(dirname "$file")"
  cp "$workspace/$file" "$starter/$file"
done
grep -q 'package-ecosystem: devcontainers' "$starter/.github/dependabot.yml"
(cd "$starter" && git init -q && git add -A && pre-commit run --all-files)

printf 'Research template assertions passed (%s).\n' "$(uname -m)"
