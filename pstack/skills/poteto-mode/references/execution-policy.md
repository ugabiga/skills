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

## Route small tasks before selecting a playbook

The main coordinator classifies the task before loading routed skills or selecting a playbook. Use the small-task route when the approach is clear, the affected behavior and callers are local and understood, and a concrete validation can establish the requested result. File count and diff length alone do not qualify a task. Read the necessary files in-thread to establish these facts. Record the route and its reason in one sentence, without asking for confirmation.

Changes to public APIs, persisted data formats or migrations, authentication, authorization, billing, or concurrency use the normal playbook route. Uncertain impact, unresolved design choices, or cross-cutting changes also use the normal route. A one-line change can still require that route.

For a small task, the coordinator defines a bounded specification, an execution worker implements and performs the necessary validation, and the coordinator reads the actual diff and validation evidence before accepting completion. Skill and configuration authoring remain coordinator-owned. Preserve existing changes. Bug fixes still require reproduction and verification of the original failure; refactoring still requires evidence that behavior is preserved. Keep validation proportional to the affected behavior.

This route takes precedence over automatic how delegation, architect design panels, arena candidates and cross-judges, interrogate panels, and no-comments reviewer calls in poteto-mode and its routed playbooks. Do not load or dispatch these workflows solely because a small change crosses a function boundary, admits incidental implementation alternatives, or reaches review or PR preparation. The coordinator inspects comments and code quality during its own review. A short task list replaces mandatory playbook todo copying and throughput checkpoints for this route.

Explicit user requests for a named specialist workflow or independent review still apply. Preserve shipping and merge approval gates, authorization boundaries, runtime evidence requirements, execution model selection and maximum worker reasoning. The coordinator budget does not select this route. Reclassify before further implementation if investigation, worker blockers, or the diff reveal broader impact or a design decision; retain valid evidence and use the normal playbook for the remaining work.

Completion of a small local task does not require opening a PR. When a PR is requested or needed by the task, apply Opening a PR with the same small-task review exception. Report the change, worker validations or coordinator-owned authoring checks, limitations, and coordinator review. Passing checks do not establish model compliance with this routing policy.

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

## Share generated skills across hosts

Skills created or maintained by any pstack workflow have one real copy in `<base>/.agents/skills/<name>/`. `<base>` is the project or user directory the skill serves. Claude Code reads a relative symlink at `<base>/.claude/skills/<name>` pointing to `../../.agents/skills/<name>`. Edit the `.agents` copy only. Never maintain separate host copies that can diverge.

When the real skill lives below the repository root, also link `<repo root>/.agents/skills/<name>` to it using a relative path, within the task's authorized root scope. If root changes are excluded, report that discovery link as pending. Before moving an existing Claude-only copy, inspect and preserve its contents and any existing destination. Conflicting independent copies require a coordinator decision. Verify that each host path resolves to the same SKILL.md and preserves its frontmatter. This rule applies to generated verification skills, personal modes, and maintained skills, not to rewriting upstream plugin packaging into user skill folders.

## Discover owned devices and ports

Verification harnesses discover available resources at launch. Never pin an emulator, simulator, device serial, AVD, or port into a generated skill. Inventory devices and listening ports, choose a free candidate from the harness's own dedicated pool and allowed port ranges, and create the next owned pool member only when necessary. Never reuse or close a session started by the user or another agent. A free port observed during scanning still needs an actual bind when the process starts; handle contention by retrying another allowed port.

Record the selected host, device, launcher session, ports, run directory, and owned process identity per checkout. Every later action and cleanup uses those recorded resources only. Provide a read-only `scan` command and print the selected values in the ready output. Validate environment overrides against the same ownership and busy rules. Scanning cannot launch, clear, or reset a device. Use the T3 device tools below for the device inventory and interaction. Build/install/log commands may use platform tools only within their supported boundary.

## Use the T3 browser and device surfaces

Browser actions remain execution-worker work. For a browser task, call `preview_status` first, then `preview_open` if no tab can be automated. Prefer snapshot locators. Switch browser only when tools are absent, preview_open reports unsupported, the user requests it, or two preview calls fail on one step; quote the failure before switching. Public-page research uses fetch/search unless browser work was asked. Never use preview tools to verify or show an edit unless the current request asks for browser work or names the page or tab. Close a tab the worker opened before handback unless the user asked to retain or uses it.

For emulator or simulator work, the coordinator provides hostId and device id when known. The worker calls `device_list` when they are unknown, then `device_open` with both. Use its returned `agent-device` launcher for every launch, deep link, tap, entry, setting, screenshot, and recording. Open the app before input or snapshots. Look at the screen through `device_screenshot`. Do not replace interaction with adb, simctl, ssh, or a wrapper. Those tools may still build, install, sync code, forward ports, or collect logs. On a device tool failure, quote it and follow its advice once, without reusing another session. If it fails again, report the blocker. Unavailable devices are blockers, not permission to take over a different session.

## Use T3 wakeups and PR tracking

For an explicitly requested scheduled run, use `schedule_task` bound to this thread and remove it with `delete_scheduled_task` when finished. Do not execute a prompt the user asked only to schedule. Never use a schedule, sleep loop, watcher child, or shell polling to wait for a running delegate or PR. Delegate completion uses its returned `next` instruction.

After creating, taking over, or pushing to a PR, the next call is `link_pull_request` with its full URL for every affected PR. A branch push that has no PR needs no PR creation or link. Do not link a PR only read as background. When asked to monitor a PR, or when requested work still depends on checks or reviews, finish the needed update and push, then call `watch_pull_request` and end the turn. Before final handback, call `unwatch_pull_request` for watches owned by this run. Children never watch PRs. Do not run gh --watch, watcher loops, Monitor, or scheduled wakeups for PR waiting.

## Load through either host without a separate TW dependency

On Codex, read poteto-mode/SKILL.md in full in a shell call of its own with `max_output_tokens: 10000`; repeat if truncated. Plugin paths come from the actual installed or supplied plugin root. Never search Cursor caches or choose a different version by guessing.

The host manifests load this plugin's session-start hook. It reads the shared model sheet, honoring `session hook: off`; missing or unreadable sheets keep guidance on. Older `<host config>/t3-pstack-models.md` paths are fallback inputs only. Reconfiguration preserves an existing sheet and never silently lowers worker reasoning. Validate candidates with this plugin's `skills/setup-pstack/scripts/t3-sheet.mjs` against the live catalog before writing them. `models.json` owns the role vocabulary and defaults; scripts, setup, and hooks must agree with it.

If T3 tools are not exposed, try the known orchestrator_capabilities tool once. When ACP provides T3_ACP_MCP_NODE, use the supported T3 transport, not a model CLI substitute:

```sh
ELECTRON_RUN_AS_NODE=1 "$T3_ACP_MCP_NODE" ${T3_ACP_MCP_ENTRYPOINT:+"$T3_ACP_MCP_ENTRYPOINT"} acp-mcp-call orchestrator_capabilities '{}'
```

Use that transport's delegate_task, task_status, and task_cancel with valid JSON arguments. If neither transport works, report BLOCKED. The shared TW file and its machine-specific absolute path are not dependencies of this integrated policy.
