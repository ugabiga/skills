---
name: get-pr-comments
description: Fetch and summarize review comments from the active pull request
---

Read the integrated [personal execution policy](../poteto-mode/references/execution-policy.md) first. Its role split, model selection, and T3 execution rules govern this file.

# Get PR comments

## Trigger

Need a concise, actionable summary of feedback on the active pull request.

## Workflow

1. Resolve the active PR for the current branch.
2. Fetch review comments and discussion comments.
3. Group feedback by severity and actionability.
4. Return a concise action list.

## Output

- Grouped feedback summary
- Action list ordered by priority
- Open questions that still need clarification