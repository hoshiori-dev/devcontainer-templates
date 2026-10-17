#!/usr/bin/env bash
set -euo pipefail

for test_script in "$(dirname "$0")"/*_test.ts; do
    "$test_script"
done
