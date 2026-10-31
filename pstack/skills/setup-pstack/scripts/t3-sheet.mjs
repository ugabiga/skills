#!/usr/bin/env node
// The T3 override sheet: one `<role>: <entry>` line per role, or a
// comma-separated list for a panel role. An entry is
// `<providerInstanceId>/<modelId>` plus `<optionId>=<value>` pairs, or
// `inherit-parent` (alias `auto`). An entry maps one to one onto a
// `delegate_task` target, so this file is the only place the grammar lives:
// setup-pstack checks a sheet against the live `orchestrator_capabilities`
// catalog with it.
//
//   node t3-sheet.mjs <sheet.md> [<catalog.json>]
//
// With a catalog, prints one line per problem and exits 1 when there is any,
// after the "ok" line on success. Without a catalog only the grammar and the
// known role policy are checked, and success never claims live dispatch.
// Bad invocation or malformed inputs exit 2. This script never writes.
//
// Personal role policy (mirrors pstack/models.json and the integrated
// execution policy):
// - Coordinator roles (default and panel tiers) use Claude or GPT families
//   only. Grok and every other family are excluded.
// - Panel roles need two distinct Claude/GPT families and no execution
//   target. `inherit-parent`/`auto` never counts as a family.
// - Execution roles (worker tier) name exactly one of
//   opencode-go/muse-spark-1.3-contributor, opencode-go/beam-free, or
//   opencode-go/muse-spark-1.2-contributor on a provider instance whose
//   catalog driverKind is opencode (instance names are not assumed), never
//   `inherit-parent`/`auto` and never a Claude/GPT target, at that model's
//   highest supported reasoning. Only recognized reasoning identifiers
//   (variant, effort, reasoningEffort) are enforced. Strength ranks
//   max > xhigh > high > medium > low > minimal. Without a catalog the
//   exact IDs and options are validated but the provider driver is not
//   verified and success never claims dispatch.
// - A role with no line runs on its tier default, so each default is
//   validated with exactly the same rules as an explicit entry.

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const INHERIT = ["inherit-parent", "auto"];
const HOOK_VALUES = ["on", "off"];
const COORDINATOR_FAMILIES = new Set(["claude", "gpt"]);
const EXEC_DRIVER = "opencode";
// Recognized reasoning option identifiers for execution models. Other
// options (for example a speed preset with low/high values) are not
// reasoning and are never forced to a maximum.
// Reasoning strength, strongest first.
const REASON_RANK = ["max", "xhigh", "high", "medium", "low", "minimal"];
const REASON_IDS = new Set(["variant", "effort", "reasoningEffort"]);
// Allowed execution models by exact model ID, with the expected
// maximum reasoning option used when no live catalog is available.
// The provider instance is validated by its catalog driverKind, never by
// its instance name, so a renamed opencode-driver instance is accepted.
const EXEC_MODELS = new Map([
  ["opencode-go/muse-spark-1.3-contributor", { label: "Muse Spark 1.3", maxOption: "variant", maxValue: "xhigh" }],
  ["opencode-go/beam-free", { label: "Beam Free", maxOption: "variant", maxValue: "max" }],
  ["opencode-go/muse-spark-1.2-contributor", { label: "Muse Spark 1.2", maxOption: "variant", maxValue: "xhigh" }],
]);

// Throws on a malformed entry; returns null for an inherit alias.
// `true`/`false` option values become actual booleans so scalar catalog
// values (strings or booleans) compare consistently.
export function parseEntry(text) {
  const [target, ...pairs] = text.trim().split(/\s+/);
  if (INHERIT.includes(target)) {
    if (pairs.length) throw new Error(`"${text.trim()}": ${target} takes no options`);
    return null;
  }
  const match = target.match(/^([A-Za-z0-9_-]+)\/([A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*)$/);
  if (!match) throw new Error(`"${text.trim()}" does not start with <providerInstanceId>/<modelId>`);
  const options = Object.create(null);
  for (const pair of pairs) {
    const option = pair.match(/^([A-Za-z0-9_]+)=([A-Za-z0-9._-]+)$/);
    if (!option) throw new Error(`"${text.trim()}": "${pair}" is not <optionId>=<value>`);
    if (option[1] in options) throw new Error(`"${text.trim()}" sets "${option[1]}" twice`);
    options[option[1]] = option[2] === "true" ? true : option[2] === "false" ? false : option[2];
  }
  return { providerInstanceId: match[1], model: match[2], options };
}

// The family is the first segment (`claude`, `gpt`, `grok`, ...) of the
// model ID's last `/` part, so a Claude model served by a Codex-driver pool
// still counts as Claude, and an OpenCode route prefix such as
// `openrouter/` decides nothing.
export const family = (model) => model.split("/").pop().split("-")[0];

// A panel's families among its concrete targets. An inherit entry does not
// count: one sheet serves every thread on the machine, so its family depends on
// the thread that dispatches.
export function panelFamilies(entries) {
  return new Set(entries.filter(Boolean).map((e) => family(e.model)));
}

// Every line but blank lines and `#` headings, as `{ line, key, value }`, with
// no key or value when the line is not exactly `<key>: <value>`. setup-pstack
// writes the sheet, so it holds no prose, and one strict rule leaves no shape a
// misspelled role line can slip through.
export function parseSheet(markdown) {
  return markdown
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .flatMap((line, i) => {
      if (line.trim() === "" || line.startsWith("#")) return [];
      const match = line.match(/^([a-z][a-z ,-]*[a-z]): (\S(?:.*\S)?)$/);
      return [{ line: i + 1, key: match?.[1], value: match?.[2] }];
    });
}

// Supported values for one catalog option. Accepts `values` lists of strings
// or booleans, legacy `options` lists of `{ id }`, `{ value }`, or plain
// values, and boolean-typed options.
function allowedValues(option) {
  if (option?.type === "boolean") return ["true", "false"];
  return (option?.values ?? option?.options ?? []).map((o) =>
    String(typeof o === "object" && o !== null ? (o.id ?? o.value ?? o) : o),
  );
}

function rankBest(values) {
  let best = null;
  for (const value of values) {
    if (best === null || REASON_RANK.indexOf(value) < REASON_RANK.indexOf(best)) best = value;
  }
  return best;
}

// Catalog reasoning options: only recognized reasoning identifiers whose
// supported values overlap the reasoning rank. Any other option (even one
// with low/high values) is not reasoning. When a model lists no such
// option, no reasoning is enforced.
function reasoningOptions(listed) {
  return (listed.options ?? []).filter(
    (o) => REASON_IDS.has(o?.id) && allowedValues(o).some((v) => REASON_RANK.includes(v)),
  );
}

function findProvider(catalog, providerInstanceId) {
  const providers = Array.isArray(catalog?.providers) ? catalog.providers : [];
  return providers.find((p) => p?.providerInstanceId === providerInstanceId);
}

function findModel(provider, model) {
  const models = Array.isArray(provider?.models) ? provider.models : [];
  return models.find((m) => m?.id === model);
}

function checkTarget({ providerInstanceId, model, options }, catalog) {
  if (!catalog) return [];
  const at = `${providerInstanceId}/${model}`;
  const provider = findProvider(catalog, providerInstanceId);
  if (!provider) return [`${at}: no provider instance "${providerInstanceId}" in this T3`];
  if (!provider.canRunChildTask || provider.canRunCrossProviderChildTask === false) {
    const why = (provider.constraints ?? []).join(" ");
    return [`${at}: "${providerInstanceId}" cannot run child tasks${why ? ` (${why})` : ""}`];
  }
  const listed = findModel(provider, model);
  if (!listed) return [`${at}: "${providerInstanceId}" does not list model "${model}"`];
  const known = listed.options ?? [];
  const problems = [];
  for (const [id, value] of Object.entries(options)) {
    const option = known.find((o) => o?.id === id);
    const allowed = allowedValues(option);
    if (!option) problems.push(`${at}: no option "${id}" (has ${known.map((o) => o?.id).join(", ") || "none"})`);
    else if (!allowed.includes(String(value))) problems.push(`${at}: ${id}=${String(value)} is not one of ${allowed.join(", ")}`);
  }
  return problems;
}

const execClass = (model) => EXEC_MODELS.get(model);

// Role-policy problems for one concrete entry (inherit aliases never reach
// here). Catalog dispatch is checked separately by checkTarget. With a
// catalog the provider instance must list driverKind opencode; without a
// catalog the exact model IDs and options are validated but the provider
// driver cannot be proven.
function checkRoleEntry(role, entry, catalog) {
  const at = `${entry.providerInstanceId}/${entry.model}`;
  if (role.tier === "worker") {
    const problems = [];
    if (catalog) {
      const provider = findProvider(catalog, entry.providerInstanceId);
      if (!provider || provider.driverKind !== EXEC_DRIVER) {
        const got = provider?.driverKind ?? "missing";
        problems.push(
          `${at}: execution needs a provider instance with the opencode driver, not "${entry.providerInstanceId}" with driver "${got}"`,
        );
        return problems;
      }
    }
    const cls = execClass(entry.model);
    if (!cls) {
      problems.push(
        `${at}: not an allowed execution model (use opencode-go/muse-spark-1.3-contributor, opencode-go/beam-free, or opencode-go/muse-spark-1.2-contributor)`,
      );
      return problems;
    }
    if (catalog) {
      const listed = findModel(findProvider(catalog, entry.providerInstanceId), entry.model);
      if (listed) {
        for (const option of reasoningOptions(listed)) {
          const best = rankBest(allowedValues(option).filter((v) => REASON_RANK.includes(v)));
          const have = entry.options[option.id];
          if (have === undefined) {
            problems.push(`${at}: execution needs ${option.id}=${best} (highest supported reasoning for this model)`);
          } else if (String(have) !== best && allowedValues(option).includes(String(have))) {
            problems.push(`${at}: execution needs ${option.id}=${best}, not ${String(have)} (use the highest supported reasoning)`);
          }
        }
      }
    } else {
      const have = entry.options[cls.maxOption];
      if (have === undefined || String(have) !== cls.maxValue) {
        problems.push(
          `${at}: without a live catalog, execution needs ${cls.maxOption}=${cls.maxValue} (the configured ${cls.label} maximum; provider driver not verified)`,
        );
      }
    }
    return problems;
  }
  if (execClass(entry.model)) {
    return [`${at}: coordinator roles use Claude or GPT perspectives; execution targets stay on worker roles`];
  }
  const fam = family(entry.model);
  if (!COORDINATOR_FAMILIES.has(fam)) {
    return [`${at}: coordinator roles use Claude or GPT families, not "${fam}" (Grok and other families are excluded)`];
  }
  return [];
}

// Problems for one role's entry texts, labeled for an explicit line or a tier
// default. Omitted roles run on their tier default, so defaults pass through
// exactly the same rules.
function checkRole(role, texts, catalog, label) {
  const problems = [];
  const report = (message) => problems.push(`${label}: ${message}`);
  if (role.tier !== "panel" && texts.length > 1) report("takes one entry, not a list");
  const entries = [];
  for (const text of texts) {
    try {
      entries.push(parseEntry(text));
    } catch (err) {
      report(err.message);
    }
  }
  if (entries.includes(null) && role.tier === "worker") {
    report("inherit-parent/auto is for coordinator roles only; execution entries must name an OpenCode target explicitly");
  }
  const targets = texts.map((t) => t.trim()).filter((t) => !INHERIT.includes(t));
  if (new Set(targets).size < targets.length) report("lists the same target twice");
  const concrete = entries.filter(Boolean);
  for (const entry of concrete) {
    for (const problem of checkRoleEntry(role, entry, catalog)) report(problem);
  }
  const runnable = [];
  for (const entry of concrete) {
    const found = checkTarget(entry, catalog);
    for (const problem of found) report(problem);
    if (!found.length) runnable.push(entry);
  }
  if (role.tier === "panel") {
    const families = panelFamilies(runnable);
    const usable = [...families].filter((f) => COORDINATOR_FAMILIES.has(f));
    if (usable.length < 2 || families.size !== usable.length) {
      report(
        `a panel needs two distinct Claude/GPT families among its targets (inherit-parent does not count), got ${[...families].join(", ") || "none"}`,
      );
    }
  }
  return problems;
}

// Problems with a parsed sheet, for the role vocabulary of models.json (each
// role with its `tier`, and the `alias` a released sheet may still use), its
// tier defaults, and an `orchestrator_capabilities` catalog. A role with no
// line runs on its tier's default, so that default must dispatch here too.
// With no catalog only the grammar and the known role policy are checked.
export function checkSheet(sheet, { roles, defaults, catalog }) {
  const problems = [];
  const byRole = new Map(roles.flatMap((r) => [[r.role, r], ...(r.alias ? [[r.alias, r]] : [])]));
  const seen = new Set();
  for (const { line, key, value } of sheet) {
    if (!key) {
      problems.push(`line ${line}: not a "<role>: <value>" line (lowercase role, one space after the colon, no indent or markup)`);
      continue;
    }
    const canonical = byRole.get(key)?.role ?? key;
    if (seen.has(canonical)) problems.push(`"${key}" appears twice; only one line may set it`);
    seen.add(canonical);
    if (key === "session hook") {
      if (!HOOK_VALUES.includes(value)) problems.push(`session hook: "${value}" is not on or off`);
      continue;
    }
    if (key === "default effort") {
      problems.push("default effort: T3 entries carry their own options; delete this line");
      continue;
    }
    const role = byRole.get(key);
    if (!role) {
      problems.push(`"${key}" is not a pstack role`);
      continue;
    }
    problems.push(...checkRole(role, value.split(","), catalog, key));
  }
  for (const role of roles.filter((r) => !seen.has(r.role))) {
    const texts = [defaults?.[role.tier] ?? []].flat().filter((t) => typeof t === "string");
    if (!texts.length) {
      problems.push(`${role.role} (no line, tier default): tier "${role.tier}" has no default entry`);
      continue;
    }
    problems.push(...checkRole(role, texts, catalog, `${role.role} (no line, tier default)`));
  }
  return problems;
}

function loadModels() {
  const url = new URL("../../../models.json", import.meta.url);
  let raw;
  try {
    raw = readFileSync(url, "utf8");
  } catch {
    console.error(`t3-sheet.mjs: cannot read models.json at ${url}`);
    process.exit(2);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`t3-sheet.mjs: models.json is not valid JSON: ${err.message}`);
    process.exit(2);
  }
  const tiers = data?.tiers;
  const roles = data?.roles;
  const tierNames = tiers ? Object.keys(tiers) : [];
  const bad =
    !tiers || typeof tiers !== "object" || !roles || !Array.isArray(roles) || !roles.length
      ? "needs a tiers object and a nonempty roles array"
      : roles.find(
          (r) =>
            !r || typeof r.role !== "string" || typeof r.tier !== "string" || typeof r.skill !== "string" ||
            !tierNames.includes(r.tier) || (r.alias !== undefined && typeof r.alias !== "string") ||
            (typeof tiers[r.tier] !== "string" && !Array.isArray(tiers[r.tier])),
        )
        ? "every role needs string role/tier/skill, a known tier, an optional string alias, and a string or list tier default"
        : null;
  if (bad) {
    console.error(`t3-sheet.mjs: models.json ${bad}`);
    process.exit(2);
  }
  return data;
}

const invoked = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  const [sheetPath, catalogPath] = process.argv.slice(2);
  if (!sheetPath || process.argv.length > 4) {
    console.error("usage: t3-sheet.mjs <sheet.md> [<catalog.json>]");
    process.exit(2);
  }
  let sheetText;
  try {
    sheetText = readFileSync(sheetPath, "utf8");
  } catch {
    console.error(`t3-sheet.mjs: cannot read sheet "${sheetPath}"`);
    process.exit(2);
  }
  const { roles, tiers } = loadModels();
  let catalog = null;
  if (catalogPath) {
    let raw;
    try {
      raw = readFileSync(catalogPath, "utf8");
    } catch {
      console.error(`t3-sheet.mjs: cannot read catalog "${catalogPath}"`);
      process.exit(2);
    }
    try {
      catalog = JSON.parse(raw);
    } catch (err) {
      console.error(`t3-sheet.mjs: catalog "${catalogPath}" is not valid JSON: ${err.message}`);
      process.exit(2);
    }
    if (!catalog || !Array.isArray(catalog.providers)) {
      console.error(`t3-sheet.mjs: catalog "${catalogPath}" has no providers list`);
      process.exit(2);
    }
  }
  const problems = checkSheet(parseSheet(sheetText), { roles, defaults: tiers, catalog });
  for (const problem of problems) console.log(problem);
  if (problems.length) process.exit(1);
  console.log(
    catalog
      ? "ok: every role line parses and dispatches on this T3"
      : "ok: sheet syntax and role policy valid (live dispatch not checked without a catalog)",
  );
}
