import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VERIFY = path.resolve(HERE, "../../scripts/verify-personal.mjs");
const VERSION = "9.9.9-test.1";

function skillDoc(name, { link = true, description = "Test skill" } = {}) {
  const lines = ["---", `name: ${name}`, `description: ${description}`, "---", ""];
  if (link) lines.push("Read the [personal execution policy](../poteto-mode/references/execution-policy.md) first.");
  else lines.push("No policy link here.");
  lines.push("", `# ${name}`, "");
  return lines.join("\n");
}

// Minimal package tree satisfying every guard check. The guard resolves the
// repository root as the package parent, so fixtures mirror that layout.
function makeGoodFixture() {
  const repo = mkdtempSync(path.join(tmpdir(), "pstack-verify-"));
  const pkg = path.join(repo, "pstack");
  const write = (rel, content) => {
    const full = path.join(pkg, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  };
  write("skills/alpha/SKILL.md", skillDoc("alpha"));
  write("skills/poteto-mode/SKILL.md", skillDoc("poteto-mode"));
  write("skills/poteto-mode/references/execution-policy.md", "# policy\n\nCoordinator owns decisions.\n");
  write("skills/poteto-mode/playbooks/first.md", "Read the [policy](../references/execution-policy.md).\n");
  for (const name of [
    "deslop", "fix-ci", "fix-merge-conflicts", "get-pr-comments",
    "make-pr-easy-to-review", "thermo-nuclear-code-quality-review",
    "thermo-nuclear-review", "thermos", "what-did-i-get-done",
  ]) {
    write(`skills/${name}/SKILL.md`, skillDoc(name, { description: `Supplemental ${name}` }));
  }
  write("agents/persona.md", "See the [policy](../skills/poteto-mode/references/execution-policy.md).\n");
  write("agents/thermo-nuclear-code-quality-review-subagent.md", "See the [policy](../skills/poteto-mode/references/execution-policy.md).\n");
  write("agents/thermo-nuclear-review-subagent.md", "See the [policy](../skills/poteto-mode/references/execution-policy.md).\n");
  write("LICENSE", "MIT\n");
  write("LICENSE-t3-pstack", "MIT T3\n");
  write("PERSONAL-INTEGRATION.md", "# integration\n");
  write("plugin.json", JSON.stringify({ name: "pstack", version: VERSION }));
  write(".claude-plugin/plugin.json", JSON.stringify({ name: "pstack", version: VERSION, agents: ["./agents/persona.md"] }));
  write(".codex-plugin/plugin.json", JSON.stringify({ name: "pstack", version: VERSION, skills: "./skills/", hooks: "./hooks/codex-hooks.json" }));
  write(".cursor-plugin/plugin.json", JSON.stringify({ name: "pstack", version: VERSION, skills: "./skills/", agents: "./agents/" }));
  write("hooks/hooks.json", JSON.stringify({ hooks: { SessionStart: [{ matcher: "startup", hooks: [{ type: "command", command: "x" }] }] } }));
  write("hooks/codex-hooks.json", JSON.stringify({ hooks: { SessionStart: [{ matcher: "startup", hooks: [{ type: "command", command: "x" }] }] } }));
  write("hooks/session-start.sh", "#!/bin/sh\nexit 0\n");
  chmodSync(path.join(pkg, "hooks", "session-start.sh"), 0o755);
  const market = (source) => JSON.stringify({ name: "skills", plugins: [{ name: "pstack", source, version: VERSION }] });
  mkdirSync(path.join(repo, ".claude-plugin"), { recursive: true });
  writeFileSync(path.join(repo, ".claude-plugin", "marketplace.json"), market("./pstack"));
  mkdirSync(path.join(repo, ".agents", "plugins"), { recursive: true });
  writeFileSync(path.join(repo, ".agents", "plugins", "marketplace.json"), market({ source: "local", path: "./pstack" }));
  return { repo, pkg };
}

function runVerify(pkg) {
  try {
    const stdout = execFileSync(process.execPath, [VERIFY, "--root", pkg], { encoding: "utf8" });
    return { exit: 0, output: stdout };
  } catch (err) {
    return { exit: err.status, output: (err.stdout?.toString() ?? "") + (err.stderr?.toString() ?? "") };
  }
}

function gitWorks() {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("verify-personal guard", () => {
  it("passes a complete fixture without touching real configs", () => {
    const { pkg } = makeGoodFixture();
    const result = runVerify(pkg);
    assert.equal(result.exit, 0, result.output);
    assert.match(result.output, /structure valid/);
  });

  it("fails a fixture skill missing its description", () => {
    const { pkg } = makeGoodFixture();
    const file = path.join(pkg, "skills", "alpha", "SKILL.md");
    writeFileSync(file, skillDoc("alpha").replace("description: Test skill\n", ""));
    const result = runVerify(pkg);
    assert.notEqual(result.exit, 0);
    assert.match(result.output, /SKILL\.md/);
    assert.match(result.output, /description/);
  });

  it("fails a fixture skill that breaks the policy link", () => {
    const { pkg } = makeGoodFixture();
    const file = path.join(pkg, "skills", "alpha", "SKILL.md");
    writeFileSync(file, skillDoc("alpha", { link: false }));
    const result = runVerify(pkg);
    assert.notEqual(result.exit, 0);
    assert.match(result.output, /execution-policy/);
  });

  it("fails an operational Grok model route in a fixture skill", () => {
    const { pkg } = makeGoodFixture();
    const file = path.join(pkg, "skills", "alpha", "SKILL.md");
    writeFileSync(file, `${skillDoc("alpha")}\nRoute reviews to grok-4.7 for speed.\n`);
    const result = runVerify(pkg);
    assert.notEqual(result.exit, 0);
    assert.match(result.output, /Grok model route/);
  });

  it("fails inline-code legacy routes while fenced examples and prohibitions pass", () => {
    const { pkg } = makeGoodFixture();
    const file = path.join(pkg, "skills", "alpha", "SKILL.md");
    writeFileSync(file, `${skillDoc("alpha")}\nRoute reviews to Use \`grok-4.7-xhigh-fast\` for speed.\n`);
    assert.match(runVerify(pkg).output, /Grok model route/);
    assert.notEqual(runVerify(pkg).exit, 0);

    writeFileSync(file, `${skillDoc("alpha")}\nSet \`subagent_type: generalPurpose\` in the call.\n`);
    const subagent = runVerify(pkg);
    assert.notEqual(subagent.exit, 0, subagent.output);
    assert.match(subagent.output, /subagent_type/);

    writeFileSync(file, `${skillDoc("alpha")}\nRun \`git worktree add ../foo\` for isolation.\n`);
    const worktree = runVerify(pkg);
    assert.notEqual(worktree.exit, 0, worktree.output);
    assert.match(worktree.output, /child-worktree/);

    writeFileSync(file, `${skillDoc("alpha")}\nNever use \`grok-4.7-xhigh-fast\` for execution.\n`);
    const prohibition = runVerify(pkg);
    assert.equal(prohibition.exit, 0, prohibition.output);

    writeFileSync(file, `${skillDoc("alpha")}\n\`\`\`text\nUse \`grok-4.7-xhigh-fast\` here.\n\`\`\`\n`);
    const fenced = runVerify(pkg);
    assert.equal(fenced.exit, 0, fenced.output);
  });

  it("fails a fixture marketplace whose plugin version disagrees", () => {
    const { repo, pkg } = makeGoodFixture();
    const market = path.join(repo, ".claude-plugin", "marketplace.json");
    const data = JSON.parse(readFileSync(market, "utf8"));
    data.plugins[0].version = "0.0.0-other";
    writeFileSync(market, JSON.stringify(data));
    const result = runVerify(pkg);
    assert.notEqual(result.exit, 0);
    assert.match(result.output, /disagree/);
  });

  it("fails marketplaces missing pstack, pointing elsewhere, or without plugin.json", () => {
    const { repo, pkg } = makeGoodFixture();
    const market = path.join(repo, ".claude-plugin", "marketplace.json");
    const good = readFileSync(market, "utf8");

    writeFileSync(market, JSON.stringify({ name: "skills", plugins: [] }));
    assert.match(runVerify(pkg).output, /no plugins|no "pstack" entry/);

    writeFileSync(market, JSON.stringify({ name: "skills", plugins: [{ name: "other", source: "./pstack", version: VERSION }] }));
    assert.match(runVerify(pkg).output, /no "pstack" entry/);

    mkdirSync(path.join(repo, "other"), { recursive: true });
    writeFileSync(path.join(repo, "other", "plugin.json"), JSON.stringify({ name: "pstack", version: VERSION }));
    writeFileSync(market, JSON.stringify({ name: "skills", plugins: [{ name: "pstack", source: "./other", version: VERSION }] }));
    const sibling = runVerify(pkg);
    assert.notEqual(sibling.exit, 0, sibling.output);
    assert.match(sibling.output, /does not point to this pstack/);

    mkdirSync(path.join(repo, "empty-dir"), { recursive: true });
    writeFileSync(market, JSON.stringify({ name: "skills", plugins: [{ name: "pstack", source: "./empty-dir", version: VERSION }] }));
    const noInner = runVerify(pkg);
    assert.notEqual(noInner.exit, 0, noInner.output);
    assert.match(noInner.output, /has no plugin\.json/);

    writeFileSync(market, good);
    assert.equal(runVerify(pkg).exit, 0);
  });

  it("fails when the cursor manifest version disagrees", () => {
    const { pkg } = makeGoodFixture();
    const file = path.join(pkg, ".cursor-plugin", "plugin.json");
    const data = JSON.parse(readFileSync(file, "utf8"));
    data.version = "0.0.0-other";
    writeFileSync(file, JSON.stringify(data));
    const result = runVerify(pkg);
    assert.notEqual(result.exit, 0);
    assert.match(result.output, /disagree/);
  });

  it("fails empty frontmatter scalars and preserves inherited keys", () => {
    const { pkg } = makeGoodFixture();
    const file = path.join(pkg, "skills", "alpha", "SKILL.md");
    const cases = [
      ["quoted empty name", "---\nname: \"\"\ndescription: Test skill\n---\nRead the [personal execution policy](../poteto-mode/references/execution-policy.md) first.\n"],
      ["quoted empty description", "---\nname: alpha\ndescription: ''\n---\nRead the [personal execution policy](../poteto-mode/references/execution-policy.md) first.\n"],
      ["null name", "---\nname: null\ndescription: Test skill\n---\nRead the [personal execution policy](../poteto-mode/references/execution-policy.md) first.\n"],
      ["tilde description", "---\nname: alpha\ndescription: ~\n---\nRead the [personal execution policy](../poteto-mode/references/execution-policy.md) first.\n"],
      ["folded description marker", "---\nname: alpha\ndescription: >\n---\nRead the [personal execution policy](../poteto-mode/references/execution-policy.md) first.\n"],
      ["literal description marker", "---\nname: alpha\ndescription: |-\n---\nRead the [personal execution policy](../poteto-mode/references/execution-policy.md) first.\n"],
    ];
    for (const [label, content] of cases) {
      writeFileSync(file, content);
      const result = runVerify(pkg);
      assert.notEqual(result.exit, 0, `${label}: ${result.output}`);
      assert.match(result.output, /frontmatter (name|description) is missing or empty/, label);
    }
    writeFileSync(
      file,
      "---\nname: alpha\ndescription: Test skill\nallowed-tools: Read\n---\nRead the [personal execution policy](../poteto-mode/references/execution-policy.md) first.\n",
    );
    assert.equal(runVerify(pkg).exit, 0);
  });

  it("fails a newly added broken link against a git baseline", { skip: !gitWorks() }, () => {
    const { repo, pkg } = makeGoodFixture();
    const env = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", HOME: repo };
    const git = (args) => execFileSync("git", ["-C", repo, "-c", "user.email=t@t", "-c", "user.name=t", ...args], { encoding: "utf8", env });
    git(["init", "-q"]);
    git(["add", "-A"]);
    git(["commit", "-qm", "baseline"]);
    git(["tag", "personal/upstream-base"]);
    const clean = runVerify(pkg);
    assert.equal(clean.exit, 0, clean.output);
    const file = path.join(pkg, "skills", "alpha", "SKILL.md");
    writeFileSync(file, `${readFileSync(file, "utf8")}\nSee [missing](./nope.md).\n`);
    const broken = runVerify(pkg);
    assert.notEqual(broken.exit, 0);
    assert.match(broken.output, /nope\.md/);
    assert.ok(!existsSync(path.join(repo, ".git", "index.lock")), "guard must not lock the repo");
  });
});
