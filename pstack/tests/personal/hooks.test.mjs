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

function runHook(host, { xdgSheet, pluginRoot = PKG, extraEnv = {} } = {}) {
  const { home, xdg } = layout();
  if (xdgSheet !== undefined) {
    mkdirSync(path.join(xdg, "pstack"), { recursive: true });
    writeFileSync(path.join(xdg, "pstack", "models.md"), xdgSheet);
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
  try {
    const stdout = execFileSync("sh", [HOOK, host], { encoding: "utf8", env });
    return { exit: 0, stdout };
  } catch (err) {
    return { exit: err.status, stdout: err.stdout?.toString() ?? "" };
  }
}

function runHookInLayout(host, home, xdg, { pluginRoot = PKG } = {}) {
  const env = {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: xdg,
    CLAUDE_PLUGIN_ROOT: pluginRoot,
    CLAUDE_CONFIG_DIR: path.join(home, ".claude"),
    CODEX_HOME: path.join(home, ".codex"),
  };
  try {
    const stdout = execFileSync("sh", [HOOK, host], { encoding: "utf8", env });
    return { exit: 0, stdout };
  } catch (err) {
    return { exit: err.status, stdout: err.stdout?.toString() ?? "" };
  }
}

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

  it("ignores removed legacy sheets; only the canonical sheet controls the hook", () => {
    // Historical literals for the removed locations. The hook itself reads
    // only pstack/models.md; these files must never silence it.
    const { home, xdg } = layout();
    const legacyPaths = [
      path.join(xdg, "t3-pstack", "models.md"),
      path.join(home, ".claude", "t3-pstack-models.md"),
      path.join(home, ".codex", "t3-pstack-models.md"),
    ];
    for (const legacy of legacyPaths) {
      mkdirSync(path.dirname(legacy), { recursive: true });
      writeFileSync(legacy, "session hook: off\n");
    }
    // Legacy off with no canonical sheet still emits guidance.
    for (const host of ["claude", "codex"]) {
      const res = runHookInLayout(host, home, xdg);
      assert.equal(res.exit, 0);
      assert.equal(res.stdout, CONTEXT, `${host}: legacy off must not silence the hook`);
    }
    // Canonical off silences even when legacy says on.
    mkdirSync(path.join(xdg, "pstack"), { recursive: true });
    writeFileSync(path.join(xdg, "pstack", "models.md"), "session hook: off\n");
    for (const legacy of legacyPaths) {
      writeFileSync(legacy, "session hook: on\n");
    }
    for (const host of ["claude", "codex"]) {
      const res = runHookInLayout(host, home, xdg);
      assert.equal(res.exit, 0);
      assert.equal(res.stdout, "", `${host}: canonical off must silence the hook`);
    }
    // Canonical on emits even when legacy says off.
    writeFileSync(path.join(xdg, "pstack", "models.md"), "session hook: on\n");
    for (const legacy of legacyPaths) {
      writeFileSync(legacy, "session hook: off\n");
    }
    for (const host of ["claude", "codex"]) {
      const res = runHookInLayout(host, home, xdg);
      assert.equal(res.exit, 0);
      assert.equal(res.stdout, CONTEXT, `${host}: canonical on must emit guidance`);
    }
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
    mkdirSync(path.join(xdg, "pstack"), { recursive: true });
    writeFileSync(path.join(xdg, "pstack", "models.md"), "session hook: off\n");
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
