#!/usr/bin/env bash
set -euo pipefail

# shellcheck source=/dev/null
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 ]]
[[ "$(id -un)" == vscode && "$(id -u)" != 0 ]]
[[ "$(sudo -n id -u)" == 0 ]]
[[ -x /bin/bash ]]
[[ -n "$SHELL" && -x "$SHELL" ]]
[[ ! -S /var/run/docker.sock ]]
printf 'Ubuntu template assertions passed (%s).\n' "$(uname -m)"
