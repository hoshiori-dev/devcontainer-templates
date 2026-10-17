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
repository settings PATCH returned `Resource not accessible by integration` (HTTP 403); readback
still permits merge commits and rebase, and automatic branch deletion is false. Squash-only and
deletion settings are therefore pending, not enforced. The denied endpoint is
`PATCH /repos/hoshiori-dev/devcontainer-templates`; apply the General checklist below with a
maintainer credential. Branch protection is deliberately deferred until bootstrap workflows exist.

Use `just labels-check` and `scripts/github.ts platform-check` to inspect drift. For denied settings
operations, give the maintainer the denied endpoint, response, and corresponding Settings page
action. A 403 may reflect account permissions, organization policy, or feature availability; retain
it as an unresolved finding. Organization settings remain outside scope.

## Maintainer configuration checklist

- In Settings → General → Pull Requests, allow squash and delete merged branches.
- In Settings → Rules → Rulesets (or Branches), protect `main` after bootstrap: require PRs and the
  observed `ci-gate`, `protected-policy`, `spec-archived`, and `secret-scan` checks; block branch
  deletion and force-push; permit the single maintainer's final review and merge.
- In Settings → Code security, inspect and enable available secret scanning and push protection.
  Confirm alerts and protection state rather than inferring from the repository being public. Review
  code scanning results from the checked-in workflow and enable the applicable CodeQL configuration.
- Ensure workflow package-write and provenance permissions match the release YAML. Check
  organization package policy if GHCR access is denied.

The protected policy workflow reads only trusted default-branch code and posts checks on the PR
head. GitHub Actions check names alone cannot establish which workflow produced a result. The
maintainer must inspect changes to workflows and approval code before merging; this repository does
not claim organization-level required-workflow enforcement. Tokens used by an agent can represent a
human account, so account permissions supplement, rather than replace, the agent authority policy.

## Verify the first release

After the maintainer merges, inspect the release run, template digest, source tag, and provenance.
In GitHub's package settings set the GHCR package visibility to Public if organization policy
permits. The repository being public does not itself establish anonymous package access.

From a clean Docker configuration without registry credentials, apply
`ghcr.io/hoshiori-dev/devcontainer-templates/ubuntu:1.0.0` with the pinned CLI to an empty temporary
project, start the container, and run its assertions. Record the reference, resolved digest,
architecture, and outcome. Repeat on the second native architecture. Never expose credentials while
demonstrating anonymous access.

For discovery beyond GHCR, consult the current
[Dev Container collection index](https://github.com/devcontainers/devcontainers.github.io)
contribution instructions. Prepare the collection URL and public consumption proof, then obtain a
separate decision before submitting an upstream listing PR.
