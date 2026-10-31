---
name: setup-pstack
description: Configure pstack coordinator models and budget while preserving the integrated execution-worker policy. Use for /setup-pstack, model configuration, or pstack budget changes.
---

Read the integrated [personal execution policy](../poteto-mode/references/execution-policy.md) before this workflow. Its role split, execution models, and dispatch rules override conflicting defaults and examples below.

# Setup pstack

Configure coordinator perspectives without changing execution-worker permissions or reasoning. This personal version writes `$XDG_CONFIG_HOME/t3-pstack/models.md`, or `~/.config/t3-pstack/models.md` when XDG_CONFIG_HOME is unset. It does not write Cursor model slugs or require a separately installed TW skill.

## Detect and load

Call `orchestrator_capabilities` according to the execution policy. Confirm Claude and GPT coordinator IDs and supported options. Confirm execution candidates in the policy when those roles need validation. Never invent IDs or reasoning options. No available candidate means a reported blocker, not a change of provider family.

Read the existing sheet if present. Preserve unrelated settings and valid explicit user choices. New configurations default to small coordinator budget with medium reasoning. Keep pstack entry guidance enabled. Do not ask for a budget already selected in the conversation or sheet. When the user requests a different budget, offer small, medium, large, or unlimited, mapped to medium, high, xhigh, or max coordinator reasoning, using the nearest supported value and disclosing adjustments.

## Select roles

Use `<providerInstanceId>/<modelId> <optionId>=<value>` entries. Split at the first slash. Validate each ID and option against the live catalog.

Claude and GPT own judgment, prose, investigation, design, and review roles. Preserve the existing role labels used by bundled skills. For new coordinator entries, prefer the live Claude Opus 5.5 and GPT 6.1 Sol IDs only when confirmed available. Arena runners, architect runners, interrogate reviewers, and cross-judge pools contain Claude and GPT perspectives only. Preserve any required independent family. Do not silently reduce a required panel when a family is missing.

The feature, refactoring, bug-fix, perf-issue, hillclimb, and swarm-worker execution entries follow the execution policy's ordered OpenCode choices. The hardest-tasks role selects a design perspective, not permission for a Claude or GPT child to implement. Browser and computer actions follow the Antigravity-first policy. Worker reasoning stays at the model's supported maximum for every budget. Never add Grok or an inherited-parent execution fallback.

An alias such as `auto` or `inherit-parent` can apply only to a coordinator role whose inherited family is Claude or GPT. Panelists return execution requests to the main coordinator rather than creating children.

## Write and report

Show the resolved role mapping and any unavailable requirements. Reuse choices already authorized by the user. Ask only for a genuinely missing preference. Do not replace valid settings with guessed models.

Write the model sheet with the chosen budget and role values. Preserve the session-entry guidance setting. Record that the integrated role split and execution reasoning override legacy role defaults. Report the actual path and any blocked roles. These choices apply when a new workflow reads the sheet.

If the user is setting up verification, check for an existing project harness or verify skill before offering the bundled verification or formal-verification skill. Those workflows keep the same coordinator and execution-worker split.
