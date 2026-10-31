import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(HERE, "../..");
const HOOK = path.join(PKG, "hooks", "session-start.sh");
const CONTEXT = readFileSync(path.join(PKG, "hooks", "session-start-context.md"), "utf8");

// Isolated host layout: the real hook script and reader run against temp
// sheets only, never the user's real configuration.
function layout() {
  const root = mkdtempSync(path.join(tmpdir(), "pstack-hook-"));
  const home = path.join(root, "home");
  const xdg = path.join(root, "xdg");
  mkdirSync(home, { recursive: true });
  mkdirSync(xdg, { recursive: true });
  return { root, home, xdg };
}

function runHook(host, { xdgSheet, legacySheet, hostHome, pluginRoot = PKG, extraEnv = {} } = {}) {
  const { home, xdg } = layout();
  if (xdgSheet !== undefined) {
    mkdirSync(path.join(xdg, "t3-pstack"), { recursive: true });
    if (typeof xdgSheet === "string") writeFileSync(path.join(xdg, "t3-pstack", "models.md"), xdgSheet);
    else writeFileSync(path.join(xdg, "t3-pstack", "models.md"), xdgSheet);
  }
  const env = {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: xdg,
    CLAUDE_PLUGIN_ROOT: pluginRoot,
    CLAUDE_CONFIG_DIR: path.join(home, ".claude"),
    CODEX_HOME: path.join(home, ".codex"),
    ...extraEnv,
  };
  if (legacySheet !== undefined && hostHome) {
    mkdirSync(hostHome(home), { recursive: true });
    writeFileSync(path.join(hostHome(home), "t3-pstack-models.md"), legacySheet);
  }
  try {
    const stdout = execFileSync("sh", [HOOK, host], { encoding: "utf8", env });
    return { exit: 0, stdout };
  } catch (err) {
    return { exit: err.status, stdout: err.stdout?.toString() ?? "" };
  }
}

const claudeLegacy = (home) => path.join(home, ".claude");
const codexLegacy = (home) => path.join(home, ".codex");

describe("session-start hook", () => {
  it("emits nothing when the sheet disables the session hook", () => {
    const off = runHook("claude", { xdgSheet: "# sheet\nsession hook: off\n" });
    assert.equal(off.exit, 0);
    assert.equal(off.stdout, "");
  });

  it("emits the bundled context when the hook is on, missing, or unreadable", () => {
    const on = runHook("claude", { xdgSheet: "session hook: on\n" });
    assert.equal(on.exit, 0);
    assert.equal(on.stdout, CONTEXT);
    const missing = runHook("claude", {});
    assert.equal(missing.exit, 0);
    assert.equal(missing.stdout, CONTEXT);
  });

  it("falls back to the legacy per-host sheet", () => {
    const claude = runHook("claude", { legacySheet: "session hook: off\n", hostHome: claudeLegacy });
    assert.equal(claude.exit, 0);
    assert.equal(claude.stdout, "");
    // A Claude legacy sheet must not silence Codex.
    const codex = runHook("codex", { legacySheet: "session hook: off\n", hostHome: claudeLegacy });
    assert.equal(codex.exit, 0);
    assert.equal(codex.stdout, CONTEXT);
    const codexOff = runHook("codex", { legacySheet: "session hook: off\n", hostHome: codexLegacy });
    assert.equal(codexOff.exit, 0);
    assert.equal(codexOff.stdout, "");
  });

  it("handles BOM, CRLF, and UTF-16LE sheets", () => {
    const bom = runHook("claude", { xdgSheet: "﻿session hook: off\n" });
    assert.equal(bom.exit, 0);
    assert.equal(bom.stdout, "");
    const crlf = runHook("claude", { xdgSheet: "session hook: off\r\n" });
    assert.equal(crlf.exit, 0);
    assert.equal(crlf.stdout, "");
    const utf16 = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from("session hook: off\n", "utf16le"),
    ]);
    const wide = runHook("claude", { xdgSheet: utf16 });
    assert.equal(wide.exit, 0);
    assert.equal(wide.stdout, "");
  });

  it("exits 2 for an unknown host and never touches the sheet", () => {
    const before = runHook("claude", { xdgSheet: "session hook: on\n" });
    assert.equal(before.stdout, CONTEXT);
    const unknown = runHook("cursor", { xdgSheet: "session hook: on\n" });
    assert.equal(unknown.exit, 2);
  });

  it("resolves the plugin root from the script location when the env var is missing", () => {
    const { home, xdg } = layout();
    mkdirSync(path.join(xdg, "t3-pstack"), { recursive: true });
    writeFileSync(path.join(xdg, "t3-pstack", "models.md"), "session hook: off\n");
    const env = {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: xdg,
      CLAUDE_CONFIG_DIR: path.join(home, ".claude"),
      CODEX_HOME: path.join(home, ".codex"),
    };
    delete env.CLAUDE_PLUGIN_ROOT;
    try {
      const stdout = execFileSync("sh", [HOOK, "claude"], { encoding: "utf8", env });
      assert.equal(stdout, "");
    } catch (err) {
      assert.fail(`script-relative run failed with exit ${err.status}: ${err.stderr}`);
    }
  });

  it("declares SessionStart hooks for both hosts", () => {
    for (const [file, host] of [
      [path.join(PKG, "hooks", "hooks.json"), "claude"],
      [path.join(PKG, "hooks", "codex-hooks.json"), "codex"],
    ]) {
      const manifest = JSON.parse(readFileSync(file, "utf8"));
      const starts = manifest?.hooks?.SessionStart;
      assert.ok(Array.isArray(starts) && starts.length, `${file} needs SessionStart entries`);
      const commands = JSON.stringify(starts);
      assert.match(commands, /startup\|resume\|clear\|compact/);
      assert.match(commands, /session-start\.sh/);
      assert.ok(
        starts.some((s) => (s.hooks ?? []).some((h) => String(h.command ?? "").includes("session-start.sh") && String(h.command ?? "").includes(host))),
        `${file} must invoke session-start.sh with ${host}`,
      );
    }
  });
});
