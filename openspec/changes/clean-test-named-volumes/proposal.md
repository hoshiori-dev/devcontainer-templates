# Proposal

## Why

Template container tests remove their containers with anonymous volumes but leave named volumes
behind. Templates and Features that mount per-container named volumes, such as the proposed
`research` template, therefore leak volumes on every local run. The testing guide requires extending
test isolation before such a template is added. Tracked in
[#14](https://github.com/hoshiori-dev/devcontainer-templates/issues/14); it blocks
[#13](https://github.com/hoshiori-dev/devcontainer-templates/pull/13).

## What Changes

- `just test <id>` removes the named volumes that its own containers mounted and that did not exist
  before the run, on success, failure, and cancellation.
- A volume that existed before the run, that the run's containers did not mount, or that a container
  outside the run still uses is never removed.
- The testing guide describes the new cleanup rule.

## Capabilities

### New Capabilities

- `template-testing`: Ownership and cleanup of the Docker resources that template container tests
  create.

### Modified Capabilities

None.

## Impact

Changes `testTemplate` in `scripts/template.ts`, its script tests, and
`.agents/knowledge/testing.md`. Shared test script changes test all templates. No published template
content changes.
