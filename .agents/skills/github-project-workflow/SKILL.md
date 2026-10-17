---
name: github-project-workflow
description: Operates this repository's GitHub work lifecycle. Use when creating or updating Issues, branches, commits, or PRs, preparing work for review, reconciling specification approval, or investigating repository settings and release records.
---

# GitHub project workflow

Resolve all project paths from the repository root. This skill is repository-local.

1. Read `.agents/knowledge/github-workflow.md` and `.agents/knowledge/authority.md`. Inspect status,
   current branch, remote, relevant Issue and PR, and prior maintainer instructions. Preserve
   unrelated work. Use the repository intake and PR forms.
2. Create or link one coherent Issue and a short feature branch. For template behavior read
   `.agents/knowledge/spec-workflow.md`, commit the approval package, and open the combined draft PR
   before implementation. Reconcile discussion into the package and wait for human approval
   evidence.
3. Implement within approved scope, run the applicable just recipes, and inspect the diff for
   credentials and unrelated changes. Stage explicit files and use the repository commit-message
   convention. Push and update the draft PR body using a body file or structured API argument to
   preserve newlines.
4. Reconcile tasks, checks, linked Issues, and human threads. Mark ready and request review when
   implementation checks pass; explicitly report the expected archive gate. Do not claim green CI
   from local checks or label presence.
5. On the maintainer's completion and archive instruction, use the official archive operation in the
   same PR, rerun checks, and report its revision. Leave merge to the maintainer. A later package
   change returns to approval; a later behavior change returns to completion review.
6. For settings or publication findings, read `.agents/knowledge/platform-operations.md`, compare
   desired configuration with API readback, and report denied or pending actions exactly. Never
   self-approve, merge, manually publish, or expand agent permissions.

Done when: the Issue/PR reflects the verified result, gate evidence is attributable, and any
maintainer action has a concrete endpoint, setting, or review request. Update this skill when
workflow events, approval records, or review gates change.

## Before publishing or changing GitHub state

Assemble the exact payload outside the repository: title and body for an Issue or comment; title,
body, `git log` messages and complete diff for a PR; JSON delta for settings or labels. Include any
attachments. Read every file for credentials, personal data, private context, unrelated content,
unintended mentions and confusing wording. Use a clean-context reader when available; otherwise
record a file-only review. Continue only with the exact verdict `SAFE TO PUBLISH: YES` and existing
user authorization for that action. An edit invalidates the verdict: review the changed payload
again. Execute noninteractively, read the remote result back, and compare it with the reviewed
payload. Review evidence never grants permission to approve, merge, archive or release.
