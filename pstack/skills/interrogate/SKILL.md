---
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Adversaries try to break a change or design, and only findings proven by a run survive."
disable-model-invocation: true
---

Read the integrated [personal execution policy](../poteto-mode/references/execution-policy.md) first. Its role split, model selection, and T3 execution rules govern this file.

# Interrogate

Adversaries try to break a change or a design. A finding survives only when a run proves it. Report the findings. Do not apply fixes.

## Frame

The scope is what the user names. Otherwise it is the branch diff from its merge base with the base branch, through the working tree. State the intent with the **in-your-own-words** skill, from the user's message, the commits, and the PR description. Ask the user when the intent is unclear.

## Fan out

Use inspect-only Claude and GPT reviewers from `interrogate reviewers` through `delegate_task`, `role: "review"`. Give them the exact scope, intent, and evidence. They return candidate failures with a concrete reproduction specification. They do not run code, edit files, or create children. The main coordinator commissions reproduction from an execution worker and supplies results to a fresh review round.

> Find failures of the stated intent. For each candidate, give the location, input or precondition, reproduction procedure, expected output, and reasoning. Request runtime evidence from the main coordinator. Label the finding unverified until commissioned execution proves it. Do not run commands, edit files, or create children. No findings is a valid result.

## Verify

The main coordinator dispatches reproductions to an execution worker and reads the output. Keep a finding only when the output proves a failure of the stated intent. Passing tests or a prediction alone do not prove a finding. Merge findings with the same root cause. Reruns belong to an execution worker.

Skip arena Phases C, D, and E. Adversaries find different failures, so the verdict keeps every verified finding, not one adversary's list.

## Output

- **Intent**: the restatement.
- **Findings**: for each verified finding, the command, its output, how it breaks the intent, and the adversaries that found it. Say "no verified findings" when none survive.
- **Dropped**: for each adversary, the count of dropped findings and why.
