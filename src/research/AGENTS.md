# Agent guide

This project runs experiments on remote compute and reports them with Quarto. Replace this paragraph
with the research question, the datasets, and any project-specific conventions.

## Safety rules

These hold on every task.

- Ask the user before any command that starts billable compute (`colab new`, `colab run`,
  `sky launch`, `sky jobs launch`, `sky serve up`, `sky start`). State the accelerator, the expected
  duration, and how the resource will be released; wait for an explicit yes. A user request for that
  specific run already counts as the yes.
- Release every resource you started once its results are saved: `colab stop` for Colab sessions,
  `sky down <cluster>` for SkyPilot clusters, `sky jobs cancel` for unfinished managed jobs. Check
  with `colab sessions` and `sky status` before ending the task, and report anything still running.
- Credentials belong in their tools' own configuration locations or in environment variables the
  user provides. Keep tokens, keys, passwords, and private hostnames out of code, notebooks, logs,
  results, reports, and commits.
- When a login or credential is missing, tell the user what is missing and let them sign in: the
  guide printed by `colab skill` describes Colab authentication, and `sky check` lists configured
  SkyPilot backends.

## Running experiments

- Colab: run `colab skill` and follow the guide it prints before the first Colab command in a task.
  Prefer `colab run`, which releases its VM when the script ends.
- SkyPilot: describe each run as a task YAML committed beside its code, and launch it on the
  backends `sky check` reports as enabled (SSH node pools, Slurm, or Kubernetes). Look up options
  with `sky <command> --help` or <https://docs.skypilot.co>, which is authoritative for SkyPilot.
- Make runs reproducible: pin dependencies with uv, set random seeds, and record the command,
  commit, backend, and accelerator with every result.
- Copy results and logs back into the workspace before releasing the resource that produced them.

## Reporting

- Write reports as Quarto documents (`.qmd`) and render them with `quarto render`.
- Build every figure and table from saved results in the workspace, so a report renders without
  remote compute.
- Separate measured results from interpretation, and state the limitations of each experiment.

## Validation

Run `pre-commit run --all-files` before committing when `.pre-commit-config.yaml` exists.
