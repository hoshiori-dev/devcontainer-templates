# Agent authority

Read before pushing, publishing a PR for review, operating repository settings, or deciding whether
an action needs human authorization. This file owns project autonomy; platform access never grants
additional authority.

Agents may inspect, plan, implement an approved scope, run checks, create Issues, create branches,
commit, push, and open or maintain draft PRs. They may mark a PR ready and request review when its
implementation checks pass and its report names any expected archive gate. Follow the specification
gate before implementation.

A human maintainer alone approves a specification, confirms finished behavior, directs archive,
merges a PR, authorizes a manual release, and changes this policy. An agent must not add its own
`spec:approved` label, manufacture an approval record, merge, trigger a manual release, bypass
checks, or broaden its authority. A maintainer's merge authorizes the automatic release workflow for
that exact commit; that does not authorize an agent to merge or manually publish.

Repository settings explicitly requested by the user may be applied within that scope and must be
read back. Repository-wide rules are enabled only after the initial workflows have run and the
initial bootstrap PR has been human-merged. Organization settings are outside this project's scope.

Escalate before dependent work when acceptance is unclear, a required check is unavailable,
implementation exceeds approved scope, a token lacks needed access, or a necessary action exceeds
these permissions. Complete independent safe work and report concrete remaining actions. Never
silently treat a denied API as success.
