Read the integrated [personal execution policy](../references/execution-policy.md) first. Its role split, model selection, and T3 execution rules govern this file.

Apply the policy's [small-task route](../references/execution-policy.md#route-small-tasks-before-selecting-a-playbook) before this playbook. Its automatic delegation and review exceptions take precedence over the steps below, including PR preparation. Explicit specialist requests and shipping gates still apply.

### Authoring or modifying a skill

**You own the skill's voice.**

1. Use the available skill-authoring skill, skill-creator or create-skill.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve.
3. Test cases if structural. Skip if subjective.
4. Run **Opening a PR**.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
