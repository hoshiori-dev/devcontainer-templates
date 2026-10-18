# GitHub and GHCR operations

Read when configuring repository settings, diagnosing access, enabling required checks, releasing,
or verifying public consumption. Repository config and workflow files own desired settings; GitHub
API responses own observed state.

## Bootstrap and access

Apply repository labels, squash-only merge, and automatic branch deletion only within the user's
authorized settings scope, then read back. Enable `main` PR and required-check protection after the
bootstrap has been human-merged and those job names have actually run. Require no independent
second-account approval. Block force-push and branch deletion. Do not turn a proposed workflow name
into a required check before GitHub has observed it.

At initial inspection on 2026-10-17 the ruleset list was empty; some legacy branch protection,
Actions settings, security, and organization issue-type queries returned 403 or could not establish
state. These observations do not prove those features are disabled. Re-read with the maintainer's
account before claiming enforcement.

Bootstrap readback on 2026-10-17: all seven declared labels were created and verified. The
repository settings PATCH returned `Resource not accessible by integration` (HTTP 403), leaving
merge settings for the maintainer to configure.

Follow-up readback on 2026-10-18 confirms PR #2 is merged, squash is the only allowed merge method,
and automatic branch deletion is enabled. The maintainer also reports configuring Actions and
security settings; their management APIs still return 403, so those settings are not independently
verified by this integration. Trusted policy now runs from `main` and emits `protected-policy` and
`spec-archived`. Enable the required-check rules after confirming these checks on a follow-up PR.

Use `just labels-check` and `scripts/github.ts platform-check` to inspect drift. For denied settings
operations, give the maintainer the denied endpoint, response, and corresponding Settings page
action. A 403 may reflect account permissions, organization policy, or feature availability; retain
it as an unresolved finding. Organization settings remain outside scope.

## Maintainer configuration checklist

- In Settings → General → Pull Requests, allow squash and delete merged branches.
- In Settings → Rules → Rulesets (or Branches), protect `main` after bootstrap: require PRs and the
  observed `ci-gate`, `spec-archived`, and `secret-scan` checks; block branch deletion and
  force-push; permit the single maintainer's final review and merge.
- In Settings → Code security, inspect and enable available secret scanning and push protection.
  Confirm alerts and protection state rather than inferring from the repository being public. Review
  code scanning results from the existing CodeQL default setup. Do not add an advanced workflow
  alongside default setup: GitHub rejects its SARIF upload. This was observed during bootstrap;
  querying default-setup configuration with the current integration still returns 403.
- Ensure workflow package-write and provenance permissions match the release YAML. Check
  organization package policy if GHCR access is denied.

After this simplification is merged and the replacement checks have run, remove `protected-policy`
from the existing ruleset and read it back. Keep it configured until then; approval automation is
not a required check. The approval label remains a contribution workflow requirement. The earlier
bootstrap readback above records the old check names, not the desired final configuration.

The archive workflow reads only trusted default-branch code and posts its check on the PR head.
GitHub Actions check names alone cannot establish which workflow produced a result. The maintainer
must inspect changes to workflows and approval code before merging; this repository does not claim
organization-level required-workflow enforcement. Tokens used by an agent can represent a human
account, so account permissions supplement, rather than replace, the agent authority policy.

## Verify the first release

After the maintainer merges, inspect the release run, template digest, source tag, and provenance.
In GitHub's package settings set the GHCR package visibility to Public if organization policy
permits. The repository being public does not itself establish anonymous package access.

From a clean Docker configuration without registry credentials, apply
`ghcr.io/hoshiori-dev/devcontainer-templates/ubuntu:1.0.0` with the latest stable CLI to an empty
temporary project, start the container, and run its assertions. Record the reference, resolved
digest, architecture, and outcome. Repeat on the second native architecture. Never expose
credentials while demonstrating anonymous access.

Release preflight checks existing versions reused by the current publication: source files,
Git-style executable flags, and attestations bound to their original source-tag commits. It refuses
missing or mismatched provenance for those versions. It does not audit every historical release or
block new versions on unrelated historical artifacts. Anonymous verification checks the package
source and applies its resolved digest, so a concurrent version-tag change cannot substitute the
artifact being consumed.

For discovery beyond GHCR, consult the current
[Dev Container collection index](https://github.com/devcontainers/devcontainers.github.io)
contribution instructions. Prepare the collection URL and public consumption proof, then obtain a
separate decision before submitting an upstream listing PR.
