#!/usr/bin/env node
// Structural guard for the personal pstack customization. Rerun after any
// upstream update: it checks that the integrated execution policy, the
// supplemental skills, the host manifests, the hooks, and the Markdown link
// graph survived the merge. Read-only; it never writes.
//
//   node verify-personal.mjs [--root <package-dir>]
//
// <package-dir> defaults to the pstack package holding this script and exists
// so tests can point the guard at temp fixtures. Exit 0 when every check
// passes (warnings allowed), 1 when a structural problem is found, 2 for bad
// invocation or an unreadable layout.

import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const POLICY_REL = "skills/poteto-mode/references/execution-policy.md";
const PLAYBOOKS_REL = "skills/poteto-mode/playbooks";
const SUPPLEMENTAL = [
  "deslop", "fix-ci", "fix-merge-conflicts", "get-pr-comments",
  "make-pr-easy-to-review", "thermo-nuclear-code-quality-review",
  "thermo-nuclear-review", "thermos", "what-did-i-get-done",
];
const PERSONAS = [
  "thermo-nuclear-code-quality-review-subagent.md",
  "thermo-nuclear-review-subagent.md",
];
const LICENSE_DOCS = ["LICENSE", "LICENSE-t3-pstack", "PERSONAL-INTEGRATION.md"];
const MANIFESTS = ["plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json", ".cursor-plugin/plugin.json"];
const EXPECTED_PLUGIN_NAME = "pstack";
const BASELINE_TAG = "personal/upstream-base";

// Split frontmatter `key: value` lines (with indented continuations) from a
// file's leading `---` fence. Inherited Cursor metadata keys are kept, never
// rejected.
export function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") return { fenced: false, data: new Map() };
  const data = new Map();
  let current = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === "---") return { fenced: true, endLine: i + 1, data };
    const key = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (key) {
      current = { value: key[2].trim(), line: i + 1 };
      data.set(key[1], current);
    } else if (current && /^\s+\S/.test(line)) {
      current.value += ` ${line.trim()}`;
    }
  }
  return { fenced: false, data };
}

// Remove fenced code blocks and inline code spans, preserving line numbers,
// so prose checks never fire on examples.
export function stripCode(text) {
  const lines = text.split("\n");
  let inFence = false;
  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return "";
      }
      if (inFence) return "";
      return line.replace(/`[^`\n]*`/g, "");
    })
    .join("\n");
}

// Remove fenced code blocks only, preserving line numbers and inline code
// spans, so operational inline tokens (for example `grok-...`,
// `subagent_type`, or `git worktree add`) are still scanned while fenced
// examples stay excluded.
export function stripFences(text) {
  const lines = text.split("\n");
  let inFence = false;
  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return "";
      }
      if (inFence) return "";
      return line;
    })
    .join("\n");
}

// A frontmatter scalar counts as empty when it is missing, blank, a quoted
// empty string, YAML null (`null`/`Null`/`NULL`), `~`, or a folded/literal
// block marker (`>`, `|`, with optional chomping/indent flags) with no
// content. No YAML dependency: this covers the forms used in skill
// frontmatter without a full parser.
export function isBlankFrontmatter(value) {
  if (value === undefined || value === null) return true;
  const text = String(value).trim();
  if (!text) return true;
  let inner = text;
  if (
    (inner.startsWith('"') && inner.endsWith('"') && inner.length >= 2) ||
    (inner.startsWith("'") && inner.endsWith("'") && inner.length >= 2)
  ) {
    inner = inner.slice(1, -1).trim();
    if (!inner) return true;
  }
  const lowered = inner.toLowerCase();
  if (lowered === "null" || inner === "~") return true;
  // A lone block marker with no content (`>`, `|`, `>-`, `|+`, `>2`, ...).
  if (/^[>|][+-]?[0-9]*[+-]?$/.test(inner)) return true;
  if (/^[>|][0-9]+[+-]?$/.test(inner)) return true;
  return false;
}

// Inline `[text](target)` and reference `[text][ref]` links with 1-based
// lines, from prose (callers strip code first when examples must not count).
export function extractLinks(text) {
  const links = [];
  const lines = text.split("\n");
  const defs = new Map();
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/^\s*\[([^\]]+)\]:\s*(\S+)/g)) defs.set(m[1], m[2]);
  });
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      links.push({ target: m[1], line: i + 1, image: m[0].startsWith("!") });
    }
    for (const m of line.matchAll(/(?<!!)\[([^\]]+)\]\[([^\]]*)\]/g)) {
      const target = defs.get(m[2] || m[1]);
      if (target) links.push({ target, line: i + 1, image: false });
    }
  });
  return links;
}

// Targets that can never resolve to a repo file: fragments, external
// schemes, absolute slash-command or machine paths, and dynamic placeholders.
export function isSkippableTarget(target) {
  if (!target || target.startsWith("#")) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target)) return true;
  if (target.startsWith("/")) return true;
  if (/[<>{}$*]/.test(target) || /\s/.test(target) || target.includes("...")) return true;
  return false;
}

export function resolveTarget(target, fromDir) {
  return path.resolve(fromDir, target.split("#")[0]);
}

function readText(file) {
  return readFileSync(file, "utf8");
}

function listFiles(dir, suffix) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(suffix))
    .map((n) => path.join(dir, n))
    .filter((f) => statSync(f).isFile())
    .sort();
}

function runGit(repoRoot, args) {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

class Guard {
  constructor(pkgRoot) {
    this.pkg = pkgRoot;
    this.repo = path.dirname(pkgRoot);
    this.problems = [];
    this.warnings = [];
    this.inherited = [];
    this.sparse = undefined;
  }
  fail(location, message) {
    this.problems.push(`${location}: ${message}`);
  }
  warn(message) {
    this.warnings.push(message);
  }
  inherit(location, message) {
    this.inherited.push(`${location}: ${message}`);
  }

  checkFrontmatter() {
    const skillsDir = path.join(this.pkg, "skills");
    if (!existsSync(skillsDir)) return this.fail("skills", "skills directory is missing");
    for (const name of readdirSync(skillsDir).filter((n) => statSync(path.join(skillsDir, n)).isDirectory()).sort()) {
      const file = path.join(skillsDir, name, "SKILL.md");
      if (!existsSync(file)) {
        this.fail(file, "top-level skill has no SKILL.md");
        continue;
      }
      const { fenced, data } = parseFrontmatter(readText(file));
      if (!fenced) {
        this.fail(`${file}:1`, "SKILL.md has no leading frontmatter fence");
        continue;
      }
      const gotName = data.get("name")?.value ?? "";
      const gotDesc = data.get("description")?.value ?? "";
      if (isBlankFrontmatter(gotName)) this.fail(`${file}:${data.get("name")?.line ?? 1}`, "frontmatter name is missing or empty");
      else if (gotName.replace(/^["']|["']$/g, "") !== name) {
        this.fail(`${file}:${data.get("name").line}`, `frontmatter name "${gotName}" does not match directory "${name}"`);
      }
      if (isBlankFrontmatter(gotDesc)) this.fail(`${file}:${data.get("description")?.line ?? 1}`, "frontmatter description is missing or empty");
    }
  }

  checkPolicyLinks() {
    const policy = path.join(this.pkg, POLICY_REL);
    if (!existsSync(policy)) return this.fail(policy, "integrated execution policy is missing");
    if (!statSync(policy).size) return this.fail(policy, "integrated execution policy is empty");
    const skillsDir = path.join(this.pkg, "skills");
    if (!existsSync(skillsDir)) return; // already reported by checkFrontmatter
    const files = [
      ...readdirSync(path.join(this.pkg, "skills"))
        .filter((n) => statSync(path.join(this.pkg, "skills", n)).isDirectory())
        .map((n) => path.join(this.pkg, "skills", n, "SKILL.md"))
        .filter(existsSync),
      ...listFiles(path.join(this.pkg, PLAYBOOKS_REL), ".md"),
      ...listFiles(path.join(this.pkg, "agents"), ".md"),
    ];
    for (const file of files.sort()) {
      const links = extractLinks(stripCode(readText(file)));
      const ok = links.some(
        (l) => !l.image && !isSkippableTarget(l.target) && resolveTarget(l.target, path.dirname(file)) === policy,
      );
      if (!ok) this.fail(file, `has no prose link resolving to ${POLICY_REL}; every skill, playbook, and persona must link the integrated policy`);
    }
  }

  checkPresence() {
    for (const name of SUPPLEMENTAL) {
      const file = path.join(this.pkg, "skills", name, "SKILL.md");
      if (!existsSync(file)) this.fail(file, "supplemental skill is missing");
      else if (!statSync(file).size) this.fail(file, "supplemental skill is empty");
    }
    for (const name of PERSONAS) {
      const file = path.join(this.pkg, "agents", name);
      if (!existsSync(file)) this.fail(file, "reviewer persona is missing");
      else if (!statSync(file).size) this.fail(file, "reviewer persona is empty");
    }
    for (const name of LICENSE_DOCS) {
      const file = path.join(this.pkg, name);
      if (!existsSync(file)) this.fail(file, "source-attribution/license doc is missing");
      else if (!statSync(file).size) this.fail(file, "source-attribution/license doc is empty");
    }
  }

  checkManifests() {
    const versions = new Map();
    const note = (file, name, version) => {
      if (name !== EXPECTED_PLUGIN_NAME) this.fail(file, `plugin name "${name}" is not "${EXPECTED_PLUGIN_NAME}"`);
      if (version) {
        if (!versions.has(version)) versions.set(version, []);
        versions.get(version).push(file);
      }
    };
    const manifests = [];
    for (const rel of MANIFESTS) {
      const file = path.join(this.pkg, rel);
      if (!existsSync(file)) {
        this.fail(file, "host manifest is missing");
        continue;
      }
      let data;
      try {
        data = JSON.parse(readText(file));
      } catch (err) {
        this.fail(file, `is not valid JSON: ${err.message}`);
        continue;
      }
      manifests.push({ rel, file, data });
      note(file, data?.name, data?.version);
    }
    for (const { rel, file, data } of manifests) {
      // Component paths in a plugin manifest resolve against the package
      // root, not the manifest's own subdirectory.
      const at = (target) => path.resolve(this.pkg, target);
      if (rel === ".claude-plugin/plugin.json") {
        for (const agent of Array.isArray(data?.agents) ? data.agents : []) {
          if (typeof agent !== "string" || !existsSync(at(agent))) this.fail(file, `agent path "${agent}" does not resolve`);
        }
      }
      if (rel === ".codex-plugin/plugin.json") {
        if (typeof data?.skills !== "string" || !existsSync(at(data.skills))) {
          this.fail(file, `skills path "${data?.skills}" does not resolve`);
        }
        if (typeof data?.hooks !== "string" || !existsSync(at(data.hooks))) {
          this.fail(file, `hooks path "${data?.hooks}" does not resolve`);
        }
      }
      if (rel === ".cursor-plugin/plugin.json") {
        if (typeof data?.skills !== "string" || !existsSync(at(data.skills))) {
          this.fail(file, `skills path "${data?.skills}" does not resolve`);
        }
        if (typeof data?.agents !== "string" || !existsSync(at(data.agents))) {
          this.fail(file, `agents path "${data?.agents}" does not resolve`);
        }
      }
    }
    for (const rel of [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"]) {
      const file = path.join(this.repo, rel);
      if (!existsSync(file)) {
        this.fail(file, "root marketplace is missing");
        continue;
      }
      let data;
      try {
        data = JSON.parse(readText(file));
      } catch (err) {
        this.fail(file, `is not valid JSON: ${err.message}`);
        continue;
      }
      const plugins = Array.isArray(data?.plugins) ? data.plugins : null;
      if (!plugins || !plugins.length) {
        this.fail(file, "marketplace has no plugins; pstack entry is missing");
        continue;
      }
      if (!plugins.some((p) => p?.name === EXPECTED_PLUGIN_NAME)) {
        this.fail(file, `marketplace has no "${EXPECTED_PLUGIN_NAME}" entry`);
        continue;
      }
      for (const plugin of plugins) {
        const source = typeof plugin?.source === "string" ? plugin.source : plugin?.source?.path;
        // Marketplace sources resolve against the repository root (the
        // marketplace lives in a dot-directory there); accept a
        // manifest-relative path as a fallback convention.
        const candidates =
          typeof source === "string"
            ? [path.resolve(this.repo, source), path.resolve(path.dirname(file), source)]
            : [];
        const resolved = candidates.find((c) => existsSync(c));
        if (!resolved) {
          this.fail(file, `plugin source "${source}" does not resolve`);
          continue;
        }
        if (plugin?.name === EXPECTED_PLUGIN_NAME) {
          if (path.resolve(resolved) !== path.resolve(this.pkg)) {
            this.fail(file, `plugin source "${source}" does not point to this pstack`);
          }
          const inner = path.join(resolved, "plugin.json");
          if (!existsSync(inner)) {
            this.fail(file, `plugin source "${source}" has no plugin.json`);
            continue;
          }
        }
        note(file, plugin?.name, plugin?.version);
        const inner = path.join(resolved, "plugin.json");
        if (existsSync(inner)) {
          try {
            const innerData = JSON.parse(readText(inner));
            if (innerData?.name !== EXPECTED_PLUGIN_NAME) this.fail(inner, `plugin name "${innerData?.name}" is not "${EXPECTED_PLUGIN_NAME}"`);
          } catch (err) {
            this.fail(inner, `is not valid JSON: ${err.message}`);
          }
        }
      }
    }
    if (versions.size > 1) {
      this.fail("plugin versions", `manifests disagree: ${[...versions].map(([v, fs]) => `${v} (${fs.join(", ")})`).join("; ")}`);
    }
  }

  checkHooks() {
    for (const rel of ["hooks/hooks.json", "hooks/codex-hooks.json"]) {
      const file = path.join(this.pkg, rel);
      if (!existsSync(file)) {
        this.fail(file, "hook manifest is missing");
        continue;
      }
      try {
        const data = JSON.parse(readText(file));
        const starts = data?.hooks?.SessionStart;
        if (!Array.isArray(starts) || !starts.length) this.fail(file, "hook manifest has no SessionStart entries");
      } catch (err) {
        this.fail(file, `is not valid JSON: ${err.message}`);
      }
    }
    const sh = path.join(this.pkg, "hooks", "session-start.sh");
    if (!existsSync(sh)) this.fail(sh, "session-start hook is missing");
    else if (!(statSync(sh).mode & 0o111)) this.fail(sh, "session-start hook is not executable");
  }

  // Operational leftovers from the pre-integration tree: a Grok model route
  // (`grok-4.x`, `grok/...`), the Cursor `subagent_type` field, or an
  // instruction that creates child checkouts outside T3 delegation. Only
  // fenced code blocks are excluded as examples; inline code spans are
  // operational and are still scanned. Lines that prohibit the pattern are
  // explanatory, not operational. The integrated policy documents the
  // prohibitions, so it is exempt.
  checkLegacyRoutes() {
    const patterns = [
      { id: "Grok model route", re: /\bgrok-[\w.]+|\bgrok\/[\w.-]+/i },
      { id: "Cursor subagent_type field", re: /\bsubagent_type\b/ },
      {
        id: "raw child-worktree creation",
        re: /\bgit worktree add\b|\bworktree_create\s*\(|creat\w*\s+[^.\n]{0,80}?\bworktrees?\b/i,
      },
    ];
    const prohibition = /\b(never|don't|doesn't|do not|does not|cannot|must not|should not|won't|avoid|instead|exclud|prohibit|forbid)\b/i;
    const policy = path.join(this.pkg, POLICY_REL);
    const roots = [path.join(this.pkg, "skills"), path.join(this.pkg, "agents")];
    const files = [];
    const walk = (dir) => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir).sort()) {
        const full = path.join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else if (entry.endsWith(".md") && full !== policy) files.push(full);
      }
    };
    roots.forEach(walk);
    for (const file of files) {
      stripFences(readText(file))
        .split("\n")
        .forEach((line, i) => {
          if (!line.trim() || prohibition.test(line)) return;
          for (const { id, re } of patterns) {
            if (re.test(line)) this.fail(`${file}:${i + 1}`, `${id}: ${line.trim().slice(0, 160)}`);
          }
        });
    }
  }

  // Newly changed Markdown links must resolve. Added lines in tracked files
  // fail when broken; other breakage in those files predates the personal
  // tree and is reported as inherited instead. Untracked files are new, so
  // every link in them must resolve.
  checkChangedLinks() {
    let baseline = null;
    try {
      baseline = runGit(this.repo, ["rev-parse", "--verify", BASELINE_TAG]).trim();
    } catch {
      return this.warn(`baseline ${BASELINE_TAG} unavailable; skipping changed-link check`);
    }
    let committed = [];
    try {
      committed = runGit(this.repo, ["diff", "--name-only", `${baseline}`, "HEAD", "--", "*.md"])
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } catch (err) {
      return this.fail("git baseline", `cannot diff ${BASELINE_TAG}..HEAD: ${err.message}`);
    }
    let status = "";
    try {
      status = runGit(this.repo, ["status", "--porcelain", "--untracked-files=all", "--", "*.md"]);
    } catch (err) {
      return this.fail("git status", `cannot list worktree changes: ${err.message}`);
    }
    const worktree = new Map();
    for (const line of status.split("\n")) {
      const m = line.match(/^(.{2})\s+(.+)$/);
      if (!m) continue;
      const name = m[2].includes(" -> ") ? m[2].split(" -> ").pop() : m[2];
      const clean = name.replace(/^"(.*)"$/, "$1");
      worktree.set(clean, m[1].trim() === "??");
    }
    const changed = new Map();
    for (const rel of committed) changed.set(rel, false);
    for (const [rel, untracked] of worktree) changed.set(rel, changed.get(rel) ?? untracked);
    for (const [rel, untracked] of [...changed].sort()) {
      const file = path.join(this.repo, rel);
      if (!existsSync(file) || !statSync(file).isFile()) continue;
      const text = readText(file);
      const lines = text.split("\n");
      let added = null;
      if (!untracked) {
        try {
          added = addedLineNumbers(runGit(this.repo, ["diff", baseline, "--", rel]));
        } catch (err) {
          this.fail(file, `cannot diff against ${BASELINE_TAG}: ${err.message}`);
          continue;
        }
      }
      const inFence = fenceLines(lines);
      lines.forEach((raw, i) => {
        const lineNo = i + 1;
        const isNew = untracked || (added && added.has(lineNo));
        if (!isNew) {
          // Pre-existing breakage is inherited, but still reported: check
          // non-code links on old lines so they appear separately.
          for (const m of stripCodeLine(raw).matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
            this.checkLink(file, lineNo, m[1], false, inFence.has(lineNo));
          }
          return;
        }
        const code = stripCodeLine(raw);
        for (const m of code.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
          this.checkLink(file, lineNo, m[1], true, inFence.has(lineNo));
        }
      });
    }
  }

  checkLink(file, line, target, isNew, inFence) {
    if (inFence || isSkippableTarget(target)) return;
    const resolved = resolveTarget(target, path.dirname(file));
    if (existsSync(resolved)) return;
    const message = `link target "${target}" does not resolve`;
    // Sparse checkout deliberately keeps tracked paths out of the working
    // tree, so an upstream link to them resolves in a full checkout. Report
    // that as inherited instead of failing every upstream plugin addition.
    if (!isNew || this.sparseExcluded(resolved)) this.inherit(`${file}:${line}`, message);
    else this.fail(`${file}:${line}`, message);
  }

  // True when the target is tracked in HEAD but excluded by sparse checkout.
  sparseExcluded(absTarget) {
    if (this.sparse === undefined) {
      try {
        this.sparse = runGit(this.repo, ["config", "--bool", "core.sparseCheckout"]).trim() === "true";
      } catch {
        this.sparse = false;
      }
    }
    if (!this.sparse) return false;
    const rel = path.relative(this.repo, absTarget);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return false;
    try {
      runGit(this.repo, ["cat-file", "-e", `HEAD:${rel.split(path.sep).join("/")}`]);
      return true;
    } catch {
      return false;
    }
  }
}

function fenceLines(lines) {
  const set = new Set();
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      set.add(i + 1);
    } else if (inFence) set.add(i + 1);
  });
  return set;
}

function stripCodeLine(line) {
  return line.replace(/`[^`\n]*`/g, "");
}

// Current-file line numbers covered by `+` diff lines (excluding `+++`).
function addedLineNumbers(diff) {
  const added = new Set();
  let current = 0;
  for (const line of diff.split("\n")) {
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      current = Number(hunk[1]);
      continue;
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      added.add(current);
      current++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    } else if (line.startsWith(" ")) {
      current++;
    } else if (line.startsWith("\\")) {
      continue;
    }
  }
  return added;
}

function main() {
  const args = process.argv.slice(2);
  let root = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--root" && args[i + 1]) root = args[++i];
    else {
      console.error("usage: verify-personal.mjs [--root <package-dir>]");
      process.exit(2);
    }
  }
  const scriptFile = fileURLToPath(import.meta.url);
  const pkg = root ? path.resolve(root) : path.dirname(path.dirname(scriptFile));
  if (!existsSync(path.join(pkg, "skills")) || !existsSync(path.join(pkg, "agents"))) {
    console.error(`verify-personal.mjs: "${pkg}" is not a pstack package (no skills/ or agents/)`);
    process.exit(2);
  }
  const guard = new Guard(pkg);
  guard.checkFrontmatter();
  guard.checkPolicyLinks();
  guard.checkPresence();
  guard.checkManifests();
  guard.checkHooks();
  guard.checkLegacyRoutes();
  guard.checkChangedLinks();
  for (const w of guard.warnings) console.log(`warning: ${w}`);
  for (const h of guard.inherited) console.log(`inherited: ${h}`);
  if (guard.problems.length) {
    for (const p of guard.problems) console.log(`problem: ${p}`);
    console.log(`verify-personal: ${guard.problems.length} problem(s) in ${pkg}`);
    process.exit(1);
  }
  console.log(`ok: personal integration structure valid (${pkg})`);
}

const invoked = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) main();
