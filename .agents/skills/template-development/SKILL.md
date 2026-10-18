---
name: template-development
description: Develops and verifies this repository's Dev Container Templates. Use when adding a template, changing template options or container behavior, updating published files, or investigating a template apply or container test failure.
---

# Template development

Resolve all project paths from the repository root. This skill is repository-local.

1. Read `.agents/knowledge/templates.md`, `.agents/knowledge/spec-workflow.md`, and the affected
   template's current metadata and spec. Every `src/` or `test/` PR includes a specification edit. For
   changed behavior, publish the package for human approval
   before tasks or implementation. Apply only after approval.
2. Keep published content under `src/<id>/` and assertions under `test/<id>/`. Check official
   image/Feature compatibility and native architectures. Select the per-template SemVer increment
   before editing published files.
3. Implement the smallest approved behavior. Exercise the applied template's OS, user, and requested
   tools from inside its container. Keep repository development dependencies out of consumer
   templates unless the approved spec requires them.
4. Edit metadata and NOTES, run `just docs`, and inspect generated README changes. Run `just check`,
   `just package`, and `just test <id>`. Read `.agents/knowledge/testing.md` for unavailable Docker
   or native architecture coverage; record missing checks accurately.
5. Update tasks and the PR's results and limitations. Keep an active change for review; sync and
   archive in the final PR into `main` only after the maintainer's explicit completion and archive instruction. Rerun checks and
   report the revision for final review.

Done when: the approved behavior has assertions, generated docs match their inputs, required checks
have evidence, and the PR accurately states its review gate.

When script arguments, publication layout, or approval procedure changes, update this skill in the
same PR and verify it against the maintained scripts.
