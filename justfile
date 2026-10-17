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
    deno test --allow-read --allow-write --allow-run --allow-env scripts/

validate base="origin/main":
    deno run -A scripts/template.ts validate --base "$1"

spec-check:
    OPENSPEC_NO_UPDATE_CHECK=1 OPENSPEC_TELEMETRY=0 openspec validate --all --strict --no-interactive

docs:
    deno run -A scripts/template.ts docs

docs-check:
    deno run -A scripts/template.ts docs-check

affected base="origin/main":
    deno run -A scripts/template.ts affected --base "$1"

test id:
    deno run -A scripts/template.ts test "$1"

package:
    deno run -A scripts/template.ts package

# Read-only label drift report. Applying a reviewed delta requires --apply.
labels *args:
    deno run -A scripts/github.ts labels "$@"

labels-check:
    deno run -A scripts/github.ts labels

platform-check:
    deno run -A scripts/github.ts platform-check
