#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
deno run --allow-read --allow-write --allow-env --allow-net --allow-run scripts/setup-tools.ts "$@"
