---
name: setup-pstack
description: Configure pstack coordinator models and budget while preserving the integrated execution-worker policy. Use for /setup-pstack, model configuration, or pstack budget changes.
---

Read the integrated [personal execution policy](../poteto-mode/references/execution-policy.md) first. Its role split, model selection, and T3 execution rules govern this file.

# Setup pstack

Configure coordinator perspectives without changing execution-worker permissions or reasoning. This personal version writes `$XDG_CONFIG_HOME/pstack/models.md`, or `~/.config/pstack/models.md` when XDG_CONFIG_HOME is unset. It does not write Cursor model slugs or require a separately installed TW skill.

## Detect and load

Call `orchestrator_capabilities` according to the execution policy. Confirm Claude and GPT coordinator IDs and supported options. Confirm execution candidates in the policy when those roles need validation. Never invent IDs or reasoning options. No available candidate means a reported blocker, not a change of provider family.

Read the existing sheet if present. Preserve unrelated settings and valid explicit user choices. New configurations default to small coordinator budget with medium reasoning. Keep pstack entry guidance enabled. Do not ask for a budget already selected in the conversation or sheet. When the user requests a different budget, offer small, medium, large, or unlimited, mapped to medium, high, xhigh, or max coordinator reasoning, using the nearest supported value and disclosing adjustments.

## Select roles

Use `<providerInstanceId>/<modelId> <optionId>=<value>` entries. Split at the first slash. Validate each ID and option against the live catalog.

Use GPT 6.1 Sol with `reasoningEffort=medium` for general judgment, prose, investigation, architecture, and review roles. Preserve existing role labels. Use Claude Opus 5.5 with `effort=medium` only for the dedicated `ui design` role and its visual design scope in the execution policy. General arena, architect, interrogate, and cross-judge pools contain GPT targets only. Independent review means a separate task, not a different family. Confirm every target in the live catalog.

The feature, refactoring, bug-fix, perf-issue, hillclimb, and swarm-worker execution entries follow the execution policy's ordered OpenCode choices. The hardest-tasks role selects a design perspective, not permission for a Claude or GPT child to implement. Browser and computer actions follow the Antigravity-first policy. Worker reasoning stays at the model's supported maximum for every budget. Never add Grok or an inherited-parent execution fallback.

Use explicit model targets so inherited Claude sessions cannot select Claude for general roles. Panelists return execution requests to the main coordinator rather than creating children.

## Write and report

Show the resolved role mapping and any unavailable requirements. Reuse choices already authorized by the user. Ask only for a genuinely missing preference. Do not replace valid settings with guessed models.

Write a temporary candidate and validate it with `node <plugin root>/skills/setup-pstack/scripts/t3-sheet.mjs <candidate> <catalog.json>`, using the actual live catalog. Keep the existing sheet unchanged when validation fails. Then write the model sheet with the chosen budget and role values. Preserve the session-entry guidance setting. Record that the integrated role split and execution reasoning override legacy role defaults. Report the actual path and any blocked roles. These choices apply when a new workflow reads the sheet.

If the user is setting up verification, check for an existing project harness or verify skill before offering the bundled verification or formal-verification skill. Those workflows keep the same coordinator and execution-worker split.
