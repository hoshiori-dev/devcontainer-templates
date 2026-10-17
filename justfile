set shell := ["bash", "-euo", "pipefail", "-c"]
set positional-arguments

default:
    @just --list

# All local checks CI runs without template containers.
check: lint scripts-check validate spec-check docs-check

lint:
    deno fmt --check
    find .devcontainer scripts test -name '*.sh' -type f -print0 | xargs -0 --no-run-if-empty shellcheck

scripts-check:
    deno check scripts/*.ts
    deno lint
    ./scripts/test.sh

validate base="origin/main":
    ./scripts/template.ts validate --base "$1"

spec-check:
    OPENSPEC_NO_UPDATE_CHECK=1 OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive

docs:
    ./scripts/template.ts docs

docs-check:
    ./scripts/template.ts docs-check

affected base="origin/main":
    ./scripts/template.ts affected --base "$1"

test id:
    ./scripts/template.ts test "$1"

package:
    ./scripts/template.ts package

# Read-only label drift report. Applying a reviewed delta requires --apply.
labels *args:
    ./scripts/github.ts labels "$@"

labels-check:
    ./scripts/github.ts labels

platform-check:
    ./scripts/github.ts platform-check
