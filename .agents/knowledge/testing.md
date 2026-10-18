# Validation and container tests

Read when running or changing validation or diagnosing CI failures. The justfile and project scripts
own executable commands; workflows select their platforms and permissions. Tests belong to project
scripts, not skill directories.

Run `just check` before review; CI passes its exact PR base as `just check <base>`. Run
`just pr-check <base>` to check that every `src/` or `test/` PR includes an added or modified
OpenSpec `spec.md`. This uses the merge base with the actual target, including for stacked PRs; it
checks file changes, while maintainers review specification coverage. Run `just test <id>` for each
changed template on a Docker-capable Linux host. `just affected` uses the comparison base to select
changed templates; shared test, script, shared Action, or workflow changes must test all templates.
CI repeats real template tests on native Linux amd64 and arm64 runners. A local amd64 pass is
evidence for amd64 only; report other execution as pending CI.

Container tests publish a package to a temporary local OCI registry, apply the published reference
by its verified manifest digest to an empty temporary project, start the resulting development
container, and execute `test/<id>/test.sh` inside it. Assert observable requirements from the spec,
including the user and OS, rather than the spelling of the config. Tests must fail when publication,
apply, startup, or an assertion fails.

The current Ubuntu test creates no named volumes. When adding a template with named volumes, extend
test isolation first: allocate run-specific names and ownership labels and remove only those names.
Container removal with `-v` cleans anonymous volumes, not named volumes.

Use a unique run identifier for registry, container, volume, and temporary-path ownership. Cleanup
must run on success, failure, and cancellation, deleting only resources owned by that test. Never
use global Docker prune as test cleanup.

Static script tests cover malformed metadata, missing version changes, stale docs, selection
behavior, specification companion changes, approval tampering, changed approval packages, and
unarchived changes targeting `main`. Approval automation maintains labels; it is not a CI dependency
or required check. Successful `awaiting-archive` marks normal review waiting; the required
`spec-archived` remains pending without occupying a runner. Missing or incomplete archived tasks and
execution errors fail validation. The executor is `archive-verdict` in
`.github/workflows/spec-archive.yml`. Follow the specification contract for the required maintainer
approval label. A workflow aggregation job succeeds only if every required upstream job succeeds;
skipped, cancelled, and failed results cannot be interpreted as green.

PR CI, PR secret scans, and archive checks cancel superseded runs within their own per-PR groups.
Archive checks do not rerun for draft/ready transitions: the archive requirement depends on the
target branch and change files. Approval record workflows let an in-progress run finish before the
next run starts. Keep the CI gate's failure and cancellation handling when reducing runner use.

For unavailable Docker, architecture runners, GHCR permissions, or GitHub checks, record the exact
missing verification. Package creation alone does not prove public anonymous consumption.
Publication verification is in the platform operations guide.

## Secret checks

Betterleaks scans staged changes in pre-commit and PR-added commits in the `betterleaks` CI job. The
independent `.github/workflows/secret.yml` runs TruffleHog on PR-added commits and pushes to `main`.
Its `secret-scan` check fails for `verified` and `unknown` results: live credentials and
verification errors. The scanner reads Git content without executing repository code and uses a
read-only token. Keep its action SHA and container digest pinned; when changing them, inspect the
upstream action and verify the image digest together.
