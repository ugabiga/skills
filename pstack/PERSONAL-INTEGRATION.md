# Personal integration sources

The base remains Cursor original pstack in this repository, pinned initially by the `personal/upstream-base` tag. Personal commits are maintained on `main`. Do not replace the whole pstack tree with a generated T3 port when updating upstream.

The integrated execution policy carries the TW role split, model routing and reasoning rules. The cross-host skill layout and owned-resource discovery rules were recovered from the user's local 2.1.0 policy and the user's previous local migration records. They are maintained in the repository now; the local migration script is not a runtime dependency.

The supplemental skills `deslop`, `fix-ci`, `fix-merge-conflicts`, `get-pr-comments`, `make-pr-easy-to-review`, `thermo-nuclear-code-quality-review`, `thermo-nuclear-review`, `thermos`, and `what-did-i-get-done`, plus the two thermo reviewer personas, were recovered from the locally installed t3-pstack 2.2.0 package. That package is distributed by Christian Bager Bach Houmann at https://github.com/chhoumann/t3-pstack under MIT, based on Lauren Tan's pstack. Their execution and review roles are adapted to the personal policy. Keep the upstream licenses and original author credits.

The T3 sheet grammar and host hook behavior are based on the same installed package. The option-catalog compatibility behavior was also present in the user's local apply-tw-policy.py. The new tests exercise the actual checker and hooks without calling paid models, starting devices, creating PRs, or changing real user settings.

## Preserve these items on updates

- The shared execution policy is reachable from every skill, playbook, and persona.
- Claude and Codex generated skills share one real copy with relative links.
- Harnesses choose free owned devices and ports, record them per checkout, and expose read-only inventory.
- Model sheets and missing-role defaults preserve roles, allowed families, worker reasoning maximum, and supported catalog options.
- Session hooks respect on/off, use their own plugin root, and never require a separate TW skill.
- T3 browser, device, scheduling, delegate completion, and PR tracking rules replace incompatible Cursor runtime instructions.
- Both host manifests and marketplace entries point at this pstack package.
- Supplemental skills and their supporting personas remain available.

Run `node pstack/scripts/verify-personal.mjs` and `node --test pstack/tests/personal/*.test.mjs` before installing an updated build. A structural check does not prove model compliance or create runtime ACL enforcement. Live browser, device, scheduled-run, and real PR scenarios are performed only when an actual task calls for them.

## Validation record for this integration

The 2026-10-31 runtime round passed 46 personal tests, the repository structural guard, shell syntax and ShellCheck, and the real model sheet plus omitted-worker defaults against a saved catalog. Reproductions covered renamed provider instances, exact allowed model IDs, independent speed options, inline legacy commands, lost marketplace entries, manifest versions, and empty frontmatter. Host validation accepted the plugin package and marketplace. Validating hooks.json as a standalone plugin manifest is not a supported hook-schema check; hook subprocess tests cover its actual entry behavior.

The main coordinator reviewed files and diffs and accepted the tested fixes. Two independent Claude review requests failed at startup with an API rate limit. No independent review verdict or merge-ready approval is claimed. The changes are maintained on the personal branch and local installation is reversible. No PR or merge is part of this update. Independent review remains outstanding; code tests do not replace that verdict.

## 2026-11-02 model routing

General coordinator roles and panel pools now use GPT 6.1 Sol with medium reasoning. The dedicated `ui design` role uses Claude Opus 5.5 with medium effort for UI visual composition, layout, typography, color, styling, and interaction presentation. General UI-feature logic and code review remain GPT work. Independent general reviews use separate GPT tasks rather than different families. Execution models, fallback order, and worker reasoning maxima are unchanged.

The shared model sheet remains the machine-wide role configuration. Maintain source defaults and routing instructions here, then keep the active Codex and Claude installations consistent. Butter and Factory use `pstack:poteto-mode`, matching the enabled `pstack@skills` plugin.
