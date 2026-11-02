---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
disable-model-invocation: true
---

Read the integrated [personal execution policy](../poteto-mode/references/execution-policy.md) first. Its role split, model selection, and T3 execution rules govern this file.

# Arena

Open a todolist with one entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything.

## Phase A: Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric, 3-6 concrete gradeable criteria for what success looks like on *this* task. It is the picker's tool in Phase D. Candidates only see the task.
3. Pick inspect-only GPT general design perspectives from `arena runners` in the shared model sheet. Route UI visual design perspectives through `ui design` under the execution policy. Confirm live targets at the coordinator budget. A design child returns a design and rationale; it never implements or creates children. For code candidates, the main coordinator approves separate implementation specifications and dispatches them to execution workers. A missing required independent perspective blocks its gate.
4. Give each candidate its own output location (a git worktree where possible, otherwise `/tmp/arena-<slug>/candidate-<n>/`), per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Dispatch design perspectives asynchronously with T3 `delegate_task`, `role: "design"`, and explicit catalog targets. Give each the task, grounding, output location, and a no-execution/no-children instruction. The main coordinator collects the designs and dispatches approved implementations to execution workers with disjoint ownership. T3 prepares any required separate worktree. End the turn on the returned completion instruction.

If a candidate produces no output, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After the candidates complete, choose an inspect-only GPT judge from `arena cross-judge pool` in a separate task from the main coordinator. A different model family is not required. It reads the rubric and candidate artifacts and returns scores and a recommendation. It neither edits nor runs commands. Runtime questions become requests to the main coordinator for worker execution. A missing required independent judge blocks its gate.

## Phase D: Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge when Phase C ran one. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per the Laziness Protocol.

## Phase E: Graft

Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per the **redesign-from-first-principles** principle skill, so the result stays coherent under one mental model. Don't paste mechanically.

If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape. No graft is needed. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

Verify the synthesized artifact like any other output, per the **prove-it-works** principle skill. If verification finds a problem the arena missed, either Phase A was wrong (re-frame and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

## Outputs

One synthesized artifact, with a short synthesis note alongside naming the base and why, the cross-judge's verdict or that Phase C skipped the judge, each graft with its source candidate, what was rejected and why, any convergence or dropouts, and the verification result.
