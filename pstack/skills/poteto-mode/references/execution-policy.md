# Personal execution policy

This policy is part of the Cursor pstack customization. Read it before running any pstack workflow, including a directly invoked skill. It overrides bundled model defaults, Task examples, personas, playbooks, and fallback instructions. Keep the original workflows and principles. Apply the role split below to every step. No separately installed TW skill is required.

## Separate decisions from execution

The main coordinator owns requirements, read-only investigation, root-cause analysis, design, the task DAG, dependencies, decision gates, integration decisions, file and diff review, skill and configuration authoring, documentation, and the final report. Claude and GPT children may provide investigation, design, and review perspectives only.

Execution workers only implement an approved specification, write and run its tests, or perform its specified browser, computer, or emulator actions. They do not investigate causes, design, expand scope, review or approve work, direct workers, or create children. They may read the files necessary to execute their specification. Missing information or a design decision returns BLOCKED to the coordinator.

The coordinator and Claude or GPT panelists do not code, execute tests, or manipulate browsers, computers, or emulators. A panelist that needs runtime evidence returns a concrete execution request to the main coordinator. The main coordinator dispatches it and supplies the evidence back in a fresh review round. A request to reproduce, prototype, benchmark, or verify is still execution and goes to a worker. Skill and configuration management remain coordinator work.

## Use T3-owned tasks for execution

The source is Cursor's original pstack. T3 is the selected execution transport for this personal customization. Translate original `Task` examples into `delegate_task` calls. Do not copy Cursor model slugs or `subagent_type` into T3 arguments. Use personas only within the permissions of the selected role. When the transport is unavailable, report the blocker. Do not substitute native subagents, Orca, Pi, a CLI model process, or a new top-level thread.

Before the first delegation in a thread, call `orchestrator_capabilities`. Confirm app-owned child support, provider availability, cross-provider permissions, model IDs, and supported options in the live catalog. Refresh after a catalog error or a user-named provider change. Runtime and tool restrictions take precedence over examples here.

Use the provider instance whose driver matches the table. The provider instance ID must come from the catalog.

| Work | First choice | Fallback order |
| --- | --- | --- |
| Coding, tests, emulator actions | OpenCode `opencode-go/muse-spark-1.3-contributor`, `variant=xhigh` | OpenCode `opencode-go/beam-free`, `variant=max`, then `opencode-go/muse-spark-1.2-contributor`, `variant=xhigh` |
| Browser and computer actions | Antigravity `gemini-3.8-flash-high`, options `{}` | The three OpenCode choices above in order |
| Investigation, design, prose, review | Claude or GPT from the model sheet | Available Claude or GPT choices within the requested panel and its independence requirements |

These execution fallbacks are the TW snapshot imported on 2026-10-31. This file owns the integrated defaults. They are not connected to Butter's TW auto-update job. Reconcile future changes explicitly in Git. Confirm availability at dispatch time. Do not infer availability from this table.

Every execution worker uses its model's highest supported reasoning. Confirm the listed values in the live catalog. Never reduce execution reasoning for cost, routine work, or the coordinator budget. High is already part of the Antigravity model ID and takes no extra reasoning option. Never invent an option for a model that has none. Grok is excluded from all roles and fallbacks.

Try the next execution candidate only for an unavailable provider or model, rate limits, quota, or service failure. An implementation failure or ambiguous requirement returns to the coordinator. Before replacing a possibly accepted task, cancel active work and confirm terminal state. Do not duplicate execution. If all allowed candidates fail, report BLOCKED. Never fall back to Claude, GPT, an inherited parent, or an unspecified target for execution.

## Keep model settings subordinate to roles

Read `$XDG_CONFIG_HOME/t3-pstack/models.md`, or `~/.config/t3-pstack/models.md` when XDG_CONFIG_HOME is unset. Existing configuration is optional. With no sheet, coordinator targets default to Claude Opus 5.5 and GPT 6.1 Sol only when their IDs and options are confirmed in the live catalog. If a required family is unavailable, preserve the review gate and report the missing reviewer.

A sheet entry has the form `<providerInstanceId>/<modelId> <optionId>=<value>`. Split at the first slash. Role values and panel lists select perspectives, but cannot give a Claude or GPT role execution rights. Legacy code-role entries that point to Claude or GPT do not override the execution table. Arena, architect, and interrogate panels use Claude and GPT only. Their implementation and runtime checks go through the main coordinator to execution workers.

The selected coordinator budget is small, with medium reasoning. Keep pstack entry guidance enabled and announce the matched playbook once. Apply the budget to coordinator targets only. Use the nearest supported coordinator reasoning value when medium is unavailable and disclose it. An alias such as `auto` or `inherit-parent` is valid only for coordinator work when the inherited family is Claude or GPT. Use explicit supported targets for execution. User-requested model changes remain subject to the role split unless the user explicitly changes that policy.

## Dispatch a bounded task

Complete investigation and choose the implementation approach before dispatch. Independent write tasks must own disjoint files or modules. Use `isolation: "worktree"` only when a separate checkout is required and supported by the tool. Let T3 prepare it. Do not create child worktrees in the shell or in the prompt. For a shared checkout, name exact absolute owned paths and preserve all existing user changes.

Every execution prompt contains the following fields with concrete values.

```text
Task ID / Round:
Goal:
Owned files/modules or target device/browser/computer scope:
Do-not-change scope:
Findings and implementation approach:
Expected behavior:
Validation criteria:
Completion condition:
Dependencies and current state:
Model: selected provider instance, model, and supported options. Do not switch models. Stop if exposed runtime metadata shows a mismatch.
Non-goals: no investigation, design, scope expansion, reviews, approvals, worker direction, or children. Read only what is necessary to execute this specification. Preserve existing changes. Return BLOCKED for missing information or decisions.
Completion report: DONE or BLOCKED, changed files or actions, validation commands and results, limitations, and available model evidence.
```

Use `role: "implementation"` for implementation or actions and `role: "test"` for test-only tasks. Set `target.providerInstanceId`, `target.model`, and `target.options` from the confirmed choice. Use a unique `clientRequestId` per task round, retaining it only for a retry of the same request. Follow the tool's runtime permissions.

Dispatch each independent wave asynchronously. Retain taskId, provider, model, requested options, round, and any child link. Follow the returned `next` instruction. Completion wakes the parent, so end the turn when instructed. Do not poll, sleep, or create watchers for running delegates. Use `task_cancel` for abandoned work. A replacement or a new review round gets a new `delegate_task`, never a continuation sent to the backing child thread.

## Verify and review the result

DONE is a report, not approval. The coordinator reads the actual files and diff, validation output, scope compliance, and preservation of prior changes. Request fixes and runtime revalidation from an execution worker. A failed check blocks completion. A check that could not run is reported as such and does not count as passing.

Compare receipt or status provider and model metadata with the requested target. Record requested reasoning options. If runtime metadata does not independently expose reasoning, say it is unverified rather than treating the worker's claim as evidence. Stop mismatched work before further execution.

An independent review requires an eligible Claude or GPT reviewer from a different family where the workflow requires it. The main coordinator's review and passing tests cannot replace that verdict. Keep the affected gate blocked if the reviewer cannot run. For findings that require reproduction, the reviewer supplies a concrete case and the main coordinator commissions the execution worker to run it.

Report the change, worker validations and limitations, coordinator review, and model-evidence limits. End playbook replies with a dispatch ledger. For coordinator-owned skill authoring or configuration, record `in-thread` and the reason.
