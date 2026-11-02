import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkSheet,
  family,
  panelFamilies,
  parseEntry,
  parseSheet,
} from "../../skills/setup-pstack/scripts/t3-sheet.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHECKER = path.resolve(HERE, "../../skills/setup-pstack/scripts/t3-sheet.mjs");
const REAL_MODELS = JSON.parse(readFileSync(path.resolve(HERE, "../../models.json"), "utf8"));

// Small role vocabulary mirroring the real models.json shape.
const ROLES = [
  { role: "feature, refactoring", tier: "worker", skill: "poteto-mode" },
  { role: "judgment and prose", tier: "default", skill: "poteto-mode" },
  { role: "hardest tasks", tier: "default", skill: "poteto-mode", alias: "strongest judgment" },
  { role: "arena runners", tier: "panel", skill: "arena" },
  { role: "ui design", tier: "ui-design", skill: "poteto-mode" },
];
const DEFAULTS = {
  default: "codex/gpt-6.1-sol reasoningEffort=medium",
  worker: "opencode/opencode-go/muse-spark-1.3-contributor variant=xhigh",
  panel: [
    "codex/gpt-6.1-sol reasoningEffort=medium",
  ],
  "ui-design": "claudeAgent/claude-opus-5-5 effort=medium",
};

// Saved-snapshot-shaped catalog exercising every supported option form:
// values of strings, values of booleans, legacy options objects, boolean
// type, a model with no options key, and providers that cannot run tasks.
function testCatalog() {
  return {
    providers: [
      {
        providerInstanceId: "opencode", driverKind: "opencode",
        canRunChildTask: true, canRunCrossProviderChildTask: true,
        models: [
          { id: "opencode-go/muse-spark-1.3-contributor", options: [{ id: "variant", values: ["minimal", "low", "medium", "high", "xhigh"] }] },
          { id: "opencode-go/beam-free", options: [{ id: "variant", values: ["low", "medium", "high", "xhigh", "max"] }] },
          { id: "opencode-go/muse-spark-1.2-contributor", options: [{ id: "variant", values: ["low", "medium", "high", "xhigh"] }] },
          { id: "opencode/big-pickle" },
        ],
      },
      {
        providerInstanceId: "claudeAgent", driverKind: "claudeAgent",
        canRunChildTask: true, canRunCrossProviderChildTask: true,
        models: [
          {
            id: "claude-opus-5-5",
            options: [
              { id: "effort", values: ["low", "medium", "high", "xhigh", "max"] },
              { id: "fastMode", values: [false, true] },
              { id: "legacy", options: [{ id: "a" }, { value: "b" }, "c"] },
              { id: "flag", type: "boolean" },
            ],
          },
        ],
      },
      {
        providerInstanceId: "codex", driverKind: "codex",
        canRunChildTask: true, canRunCrossProviderChildTask: true,
        models: [
          {
            id: "gpt-6.1-sol",
            options: [
              { id: "reasoningEffort", values: ["low", "medium", "high", "xhigh", "max"] },
              { id: "fastMode", values: [false, true] },
              { id: "legacy", options: [{ id: "a" }, { value: "b" }, "c"] },
              { id: "flag", type: "boolean" },
            ],
          },
        ],
      },
      {
        providerInstanceId: "grok", driverKind: "grok",
        canRunChildTask: true, canRunCrossProviderChildTask: true,
        models: [
          { id: "grok-4.7", options: [{ id: "reasoningEffort", values: ["xhigh", "high", "medium", "low"] }] },
        ],
      },
      {
        providerInstanceId: "cursor", driverKind: "cursor",
        canRunChildTask: false, canRunCrossProviderChildTask: false, models: [],
      },
      {
        providerInstanceId: "pi", driverKind: "pi",
        canRunChildTask: true, canRunCrossProviderChildTask: false,
        constraints: ["needs pairing"],
        models: [{ id: "default", options: [] }],
      },
    ],
  };
}

const VALID_SHEET = [
  "feature, refactoring: opencode/opencode-go/muse-spark-1.3-contributor variant=xhigh",
  "judgment and prose: codex/gpt-6.1-sol reasoningEffort=medium",
  "hardest tasks: codex/gpt-6.1-sol reasoningEffort=medium",
  "arena runners: codex/gpt-6.1-sol reasoningEffort=medium",
  "ui design: claudeAgent/claude-opus-5-5 effort=medium",
  "session hook: on",
].join("\n");

function check(text, { roles = ROLES, defaults = DEFAULTS, catalog = testCatalog() } = {}) {
  return checkSheet(parseSheet(text), { roles, defaults, catalog });
}

describe("sheet grammar", () => {
  it("accepts a valid sheet against the catalog", () => {
    assert.deepEqual(check(VALID_SHEET), []);
  });

  it("splits targets at the first slash for nested model IDs", () => {
    const entry = parseEntry("opencode/opencode-go/muse-spark-1.3-contributor variant=xhigh");
    assert.equal(entry.providerInstanceId, "opencode");
    assert.equal(entry.model, "opencode-go/muse-spark-1.3-contributor");
    assert.deepEqual({ ...entry.options }, { variant: "xhigh" });
  });

  it("rejects malformed entries and duplicate options", () => {
    assert.throws(() => parseEntry("no-slash-here"), /providerInstanceId/);
    assert.throws(() => parseEntry("opencode/m effort=low effort=high"), /twice/);
    assert.throws(() => parseEntry("auto effort=low"), /takes no options/);
    assert.equal(parseEntry("auto"), null);
    assert.equal(parseEntry("inherit-parent"), null);
  });

  it("rejects non role lines, unknown roles, and legacy keys", () => {
    assert.match(check("Not a role line")[0], /not a "<role>/);
    assert.match(check("nope: opencode/opencode-go/beam-free variant=max")[0], /not a pstack role/);
    assert.match(check("default effort: medium")[0], /delete this line/);
  });

  it("rejects duplicate roles, including via alias", () => {
    const twice = check("judgment and prose: codex/gpt-6.1-sol reasoningEffort=medium\njudgment and prose: codex/gpt-6.1-sol reasoningEffort=medium");
    assert.match(twice.join("\n"), /appears twice/);
    const aliased = check("hardest tasks: codex/gpt-6.1-sol reasoningEffort=medium\nstrongest judgment: codex/gpt-6.1-sol reasoningEffort=medium");
    assert.match(aliased.join("\n"), /appears twice/);
  });

  it("accepts the strongest judgment alias for the hardest tasks role", () => {
    assert.deepEqual(check("strongest judgment: codex/gpt-6.1-sol reasoningEffort=medium"), []);
  });

  it("controls the session hook with on/off and rejects other values", () => {
    assert.deepEqual(check("session hook: on"), []);
    assert.deepEqual(check("session hook: off"), []);
    assert.match(check("session hook: sometimes")[0], /not on or off/);
  });

  it("rejects comma lists on non-panel roles and duplicate panel targets", () => {
    assert.match(
      check("judgment and prose: codex/gpt-6.1-sol reasoningEffort=medium, codex/gpt-6.1-sol reasoningEffort=high").join("\n"),
      /one entry, not a list/,
    );
    assert.match(
      check("arena runners: codex/gpt-6.1-sol reasoningEffort=medium, codex/gpt-6.1-sol reasoningEffort=medium").join("\n"),
      /same target twice/,
    );
  });
});

describe("catalog option shapes", () => {
  const coord = (entry) => check(`judgment and prose: ${entry}`);
  const uiCoord = (entry) => check(`ui design: ${entry}`);

  it("accepts supported values and boolean-typed options", () => {
    assert.deepEqual(coord("codex/gpt-6.1-sol reasoningEffort=high"), []);
    assert.deepEqual(coord("codex/gpt-6.1-sol reasoningEffort=medium flag=true"), []);
    assert.deepEqual(uiCoord("claudeAgent/claude-opus-5-5 effort=high"), []);
    assert.deepEqual(uiCoord("claudeAgent/claude-opus-5-5 effort=medium flag=true"), []);
  });

  it("accepts legacy options shapes and scalar booleans as booleans", () => {
    const entry = parseEntry("codex/gpt-6.1-sol fastMode=true");
    assert.equal(entry.options.fastMode, true);
    assert.deepEqual(coord("codex/gpt-6.1-sol reasoningEffort=medium fastMode=true"), []);
    assert.deepEqual(coord("codex/gpt-6.1-sol reasoningEffort=medium legacy=a"), []);
    assert.deepEqual(coord("codex/gpt-6.1-sol reasoningEffort=medium legacy=b"), []);
    assert.deepEqual(coord("codex/gpt-6.1-sol reasoningEffort=medium legacy=c"), []);
  });

  it("rejects unknown options, unsupported values, and bad booleans", () => {
    assert.match(coord("codex/gpt-6.1-sol nope=1").join("\n"), /no option/);
    assert.match(coord("codex/gpt-6.1-sol reasoningEffort=ultra").join("\n"), /not one of/);
    assert.match(coord("codex/gpt-6.1-sol reasoningEffort=medium fastMode=yes").join("\n"), /not one of/);
    assert.match(coord("codex/gpt-6.1-sol reasoningEffort=medium legacy=z").join("\n"), /not one of/);
  });

  it("fails missing providers, models, and providers that cannot run tasks", () => {
    assert.match(coord("missing/gpt-6.1-sol reasoningEffort=medium").join("\n"), /no provider instance/);
    assert.match(coord("codex/nope-9 reasoningEffort=medium").join("\n"), /does not list model/);
    assert.match(coord("cursor/default reasoningEffort=medium").join("\n"), /cannot run child tasks/);
    assert.match(check("judgment and prose: pi/default").join("\n"), /cannot run child tasks/);
  });
});

describe("role policy", () => {
  it("keeps the coordinator budget small instead of forcing maximum reasoning", () => {
    assert.deepEqual(check("judgment and prose: codex/gpt-6.1-sol reasoningEffort=medium"), []);
    assert.deepEqual(check("ui design: claudeAgent/claude-opus-5-5 effort=medium"), []);
  });

  it("rejects inherit aliases on coordinator roles; explicit targets enforce routing", () => {
    for (const entry of ["inherit-parent", "auto"]) {
      assert.match(check(`judgment and prose: ${entry}`).join("\n"), /rejected.*explicit target/);
      assert.match(check(`arena runners: ${entry}`).join("\n"), /rejected.*explicit target|one or more explicit GPT/);
      assert.match(check(`ui design: ${entry}`).join("\n"), /rejected.*explicit target/);
    }
    assert.match(
      check("arena runners: auto, codex/gpt-6.1-sol reasoningEffort=medium").join("\n"),
      /rejected.*explicit target/,
    );
  });

  it("reserves Claude for UI visual design and GPT for general roles", () => {
    assert.match(check("judgment and prose: claudeAgent/claude-opus-5-5 effort=medium").join("\n"), /GPT family only.*not "claude"/);
    assert.match(check("ui design: codex/gpt-6.1-sol reasoningEffort=medium").join("\n"), /Claude family only.*not "gpt"/);
    assert.match(check("ui design: grok/grok-4.7 reasoningEffort=high").join("\n"), /Claude family only.*not "grok"/);
  });

  it("rejects Grok and other non-GPT families on general roles", () => {
    assert.match(check("judgment and prose: grok/grok-4.7 reasoningEffort=high").join("\n"), /not "grok"/);
    assert.match(
      check("arena runners: grok/grok-4.7 reasoningEffort=high").join("\n"),
      /GPT family only.*not "grok"|GPT targets only/,
    );
  });

  it("accepts GPT-only panels as independent reviews with no cross-family requirement", () => {
    assert.deepEqual(check("arena runners: codex/gpt-6.1-sol reasoningEffort=medium"), []);
    assert.deepEqual(
      check("arena runners: codex/gpt-6.1-sol reasoningEffort=medium, codex/gpt-6.1-sol reasoningEffort=high"),
      [],
    );
    assert.match(
      check("arena runners: claudeAgent/claude-opus-5-5 effort=medium").join("\n"),
      /GPT family only/,
    );
    assert.match(
      check("arena runners: claudeAgent/claude-opus-5-5 effort=medium, codex/gpt-6.1-sol reasoningEffort=medium").join("\n"),
      /GPT family only|GPT targets only/,
    );
    assert.match(
      check("arena runners: codex/gpt-6.1-sol reasoningEffort=medium, opencode/opencode-go/beam-free variant=max").join("\n"),
      /execution targets stay on worker roles|GPT targets only/,
    );
    assert.match(check("arena runners: auto").join("\n"), /rejected|one or more explicit GPT/);
  });

  it("rejects inherit aliases and Claude/GPT targets on execution roles", () => {
    for (const entry of ["inherit-parent", "auto"]) {
      assert.match(check(`feature, refactoring: ${entry}`).join("\n"), /rejected.*explicitly/);
    }
    assert.match(check("feature, refactoring: claudeAgent/claude-opus-5-5 effort=medium").join("\n"), /opencode driver/);
    assert.match(check("feature, refactoring: codex/gpt-6.1-sol reasoningEffort=medium").join("\n"), /opencode driver/);
    assert.match(check("feature, refactoring: grok/grok-4.7 reasoningEffort=high").join("\n"), /opencode driver/);
    assert.match(check("feature, refactoring: opencode/opencode/big-pickle").join("\n"), /not an allowed execution model/);
    assert.match(check("feature, refactoring: opencode/some-random-model variant=max").join("\n"), /not an allowed execution model/);
  });

  it("accepts any opencode-driver instance and enforces exact execution IDs", () => {
    const renamed = {
      providers: [
        {
          providerInstanceId: "opencode-local", driverKind: "opencode",
          canRunChildTask: true, canRunCrossProviderChildTask: true,
          models: [
            { id: "opencode-go/muse-spark-1.3-contributor", options: [{ id: "variant", values: ["minimal", "low", "medium", "high", "xhigh"] }] },
          ],
        },
        {
          providerInstanceId: "claudeAgent", driverKind: "claudeAgent",
          canRunChildTask: true, canRunCrossProviderChildTask: true,
          models: [{ id: "claude-opus-5-5", options: [{ id: "effort", values: ["low", "medium", "high"] }] }],
        },
        {
          providerInstanceId: "codex", driverKind: "codex",
          canRunChildTask: true, canRunCrossProviderChildTask: true,
          models: [{ id: "gpt-6.1-sol", options: [{ id: "reasoningEffort", values: ["low", "medium", "high"] }] }],
        },
      ],
    };
    assert.deepEqual(
      check("feature, refactoring: opencode-local/opencode-go/muse-spark-1.3-contributor variant=xhigh", { catalog: renamed }),
      [],
    );
    const wrongDriver = {
      providers: [
        {
          providerInstanceId: "opencode", driverKind: "codex",
          canRunChildTask: true, canRunCrossProviderChildTask: true,
          models: [
            { id: "opencode-go/muse-spark-1.3-contributor", options: [{ id: "variant", values: ["minimal", "low", "medium", "high", "xhigh"] }] },
          ],
        },
      ],
    };
    assert.match(
      check("feature, refactoring: opencode/opencode-go/muse-spark-1.3-contributor variant=xhigh", { catalog: wrongDriver }).join("\n"),
      /opencode driver/,
    );
    const wrongNs = {
      providers: [
        {
          providerInstanceId: "opencode", driverKind: "opencode",
          canRunChildTask: true, canRunCrossProviderChildTask: true,
          models: [
            { id: "custom/muse-spark-1.3-contributor", options: [{ id: "variant", values: ["minimal", "low", "medium", "high", "xhigh"] }] },
          ],
        },
      ],
    };
    assert.match(
      check("feature, refactoring: opencode/custom/muse-spark-1.3-contributor variant=xhigh", { catalog: wrongNs }).join("\n"),
      /not an allowed execution model/,
    );
  });

  it("rejects a missing driver even for the literal opencode instance", () => {
    const catalog = {
      providers: [
        {
          providerInstanceId: "opencode",
          canRunChildTask: true, canRunCrossProviderChildTask: true,
          models: [
            { id: "opencode-go/muse-spark-1.3-contributor", options: [{ id: "variant", values: ["minimal", "low", "medium", "high", "xhigh"] }] },
          ],
        },
      ],
    };
    assert.match(
      check("feature, refactoring: opencode/opencode-go/muse-spark-1.3-contributor variant=xhigh", { catalog }).join("\n"),
      /opencode driver/,
    );
  });

  it("requires the highest supported reasoning on execution entries", () => {
    assert.deepEqual(check("feature, refactoring: opencode/opencode-go/muse-spark-1.3-contributor variant=xhigh"), []);
    assert.deepEqual(check("feature, refactoring: opencode/opencode-go/beam-free variant=max"), []);
    assert.deepEqual(check("feature, refactoring: opencode/opencode-go/muse-spark-1.2-contributor variant=xhigh"), []);
    assert.match(check("feature, refactoring: opencode/opencode-go/beam-free variant=low").join("\n"), /needs variant=max/);
    assert.match(check("feature, refactoring: opencode/opencode-go/beam-free").join("\n"), /needs variant=max/);
    assert.match(check("feature, refactoring: opencode/opencode-go/muse-spark-1.3-contributor variant=medium").join("\n"), /needs variant=xhigh/);
    assert.match(check("feature, refactoring: opencode/opencode-go/muse-spark-1.3-contributor").join("\n"), /needs variant=xhigh/);
  });

  it("does not force non-reasoning options with low/high values", () => {
    const catalog = {
      providers: [
        {
          providerInstanceId: "opencode", driverKind: "opencode",
          canRunChildTask: true, canRunCrossProviderChildTask: true,
          models: [
            {
              id: "opencode-go/muse-spark-1.3-contributor",
              options: [
                { id: "variant", values: ["minimal", "low", "medium", "high", "xhigh"] },
                { id: "speed", values: ["low", "high"] },
              ],
            },
          ],
        },
        {
          providerInstanceId: "claudeAgent", driverKind: "claudeAgent",
          canRunChildTask: true, canRunCrossProviderChildTask: true,
          models: [{ id: "claude-opus-5-5", options: [{ id: "effort", values: ["low", "medium", "high"] }] }],
        },
        {
          providerInstanceId: "codex", driverKind: "codex",
          canRunChildTask: true, canRunCrossProviderChildTask: true,
          models: [{ id: "gpt-6.1-sol", options: [{ id: "reasoningEffort", values: ["low", "medium", "high"] }] }],
        },
      ],
    };
    assert.deepEqual(
      check("feature, refactoring: opencode/opencode-go/muse-spark-1.3-contributor variant=xhigh speed=low", { catalog }),
      [],
    );
  });

  it("validates omitted roles against the same rules as explicit entries", () => {
    assert.deepEqual(check(""), []);
    const bad = check("", { defaults: { ...DEFAULTS, worker: "grok/grok-4.7 reasoningEffort=high" } });
    assert.match(bad.join("\n"), /no line, tier default/);
    const missing = check("", { defaults: { default: DEFAULTS.default } });
    assert.match(missing.join("\n"), /has no default entry/);
  });

  it("enforces known execution maxima without a catalog", () => {
    const noCatalog = { catalog: null };
    assert.deepEqual(check("feature, refactoring: opencode/opencode-go/muse-spark-1.3-contributor variant=xhigh", noCatalog), []);
    assert.deepEqual(check("feature, refactoring: opencode/opencode-go/beam-free variant=max", noCatalog), []);
    assert.match(check("feature, refactoring: opencode/opencode-go/muse-spark-1.3-contributor variant=low", noCatalog).join("\n"), /configured Muse Spark 1\.3 maximum/);
    assert.match(check("feature, refactoring: opencode/some-random-model variant=max", noCatalog).join("\n"), /not an allowed execution model/);
    assert.match(check("judgment and prose: grok/grok-4.7 reasoningEffort=high", noCatalog).join("\n"), /excluded/);
    assert.match(check("judgment and prose: claudeAgent/claude-opus-5-5 effort=medium", noCatalog).join("\n"), /GPT family only/);
    assert.match(check("ui design: codex/gpt-6.1-sol reasoningEffort=medium", noCatalog).join("\n"), /Claude family only/);
    assert.match(check("judgment and prose: auto", noCatalog).join("\n"), /rejected/);
    assert.match(check("mystery: auto", noCatalog).join("\n"), /not a pstack role/);
  });
});

describe("family helpers", () => {
  it("classifies families by final model segment", () => {
    assert.equal(family("claude-opus-5-5"), "claude");
    assert.equal(family("gpt-6.1-sol"), "gpt");
    assert.equal(family("grok-4.7"), "grok");
    assert.equal(family("opencode-go/muse-spark-1.3-contributor"), "muse");
    assert.equal(family("openrouter/some/gpt-6.1-sol"), "gpt");
  });

  it("ignores inherit entries in panel families", () => {
    const families = panelFamilies([null, { providerInstanceId: "codex", model: "gpt-6.1-sol", options: {} }]);
    assert.deepEqual([...families], ["gpt"]);
  });
});

describe("real models.json vocabulary", () => {
  it("has tiers with role/tier/skill entries and optional aliases", () => {
    assert.ok(REAL_MODELS.tiers.default && REAL_MODELS.tiers.worker && REAL_MODELS.tiers.panel && REAL_MODELS.tiers["ui-design"]);
    for (const role of REAL_MODELS.roles) {
      assert.equal(typeof role.role, "string");
      assert.equal(typeof role.tier, "string");
      assert.equal(typeof role.skill, "string");
    }
  });

  it("passes an empty sheet on defaults and a sheet omitting all worker lines", () => {
    const catalog = testCatalog();
    const empty = checkSheet(parseSheet("session hook: on"), {
      roles: REAL_MODELS.roles, defaults: REAL_MODELS.tiers, catalog,
    });
    assert.deepEqual(empty, []);
    const workerRoles = new Set(REAL_MODELS.roles.filter((r) => r.tier === "worker").map((r) => r.role));
    assert.equal(workerRoles.size, 5);
    const lines = [
      "judgment and prose: codex/gpt-6.1-sol reasoningEffort=medium",
      "hardest tasks: codex/gpt-6.1-sol reasoningEffort=medium",
      "how explorer: codex/gpt-6.1-sol reasoningEffort=medium",
      "how explainer: codex/gpt-6.1-sol reasoningEffort=medium",
      "why investigators: codex/gpt-6.1-sol reasoningEffort=medium",
      "why synthesizer: codex/gpt-6.1-sol reasoningEffort=medium",
      "reflect tooling: codex/gpt-6.1-sol reasoningEffort=medium",
      "reflect judgment, divergent, synthesizer: codex/gpt-6.1-sol reasoningEffort=medium",
      "arena runners: codex/gpt-6.1-sol reasoningEffort=medium",
      "arena cross-judge pool: codex/gpt-6.1-sol reasoningEffort=medium",
      "architect runners: codex/gpt-6.1-sol reasoningEffort=medium",
      "interrogate reviewers: codex/gpt-6.1-sol reasoningEffort=medium",
      "ui design: claudeAgent/claude-opus-5-5 effort=medium",
      "session hook: on",
    ].join("\n");
    const omitted = checkSheet(parseSheet(lines), {
      roles: REAL_MODELS.roles, defaults: REAL_MODELS.tiers, catalog,
    });
    assert.deepEqual(omitted, []);
  });
});

describe("checker CLI", () => {
  function runCli(args, { stdout = "pipe" } = {}) {
    try {
      const out = execFileSync(process.execPath, [CHECKER, ...args], { encoding: "utf8", stdio: [stdout === "pipe" ? "ignore" : stdout, "pipe", "pipe"] });
      return { exit: 0, stdout: out, stderr: "" };
    } catch (err) {
      return { exit: err.status, stdout: err.stdout?.toString() ?? "", stderr: err.stderr?.toString() ?? "" };
    }
  }

  it("exits 2 on bad invocation or malformed inputs", () => {
    assert.equal(runCli([]).exit, 2);
    const dir = mkdtempSync(path.join(tmpdir(), "t3-sheet-"));
    const missing = runCli([path.join(dir, "nope.md"), path.join(dir, "nope.json")]);
    assert.equal(missing.exit, 2);
    assert.match(missing.stderr, /cannot read sheet/);
    const sheet = path.join(dir, "sheet.md");
    writeFileSync(sheet, "session hook: on\n");
    const badCatalog = path.join(dir, "catalog.json");
    writeFileSync(badCatalog, "{nope");
    const malformed = runCli([sheet, badCatalog]);
    assert.equal(malformed.exit, 2);
    assert.match(malformed.stderr, /not valid JSON/);
  });

  it("checks a sheet against a catalog file with exit 1/0", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "t3-sheet-"));
    const catalog = path.join(dir, "catalog.json");
    writeFileSync(catalog, JSON.stringify(testCatalog()));
    const bad = path.join(dir, "bad.md");
    writeFileSync(bad, "feature, refactoring: grok/grok-4.7 reasoningEffort=high\n");
    const failed = runCli([bad, catalog]);
    assert.equal(failed.exit, 1);
    assert.match(failed.stdout, /opencode driver/);
    const good = path.join(dir, "good.md");
    writeFileSync(good, `${VALID_SHEET}\n`);
    const passed = runCli([good, catalog]);
    assert.equal(passed.exit, 0);
    assert.match(passed.stdout, /parses and dispatches/);
  });

  it("supports no-catalog mode without claiming dispatch validation", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "t3-sheet-"));
    const good = path.join(dir, "good.md");
    writeFileSync(good, "feature, refactoring: opencode/opencode-go/beam-free variant=max\nsession hook: on\n");
    const passed = runCli([good]);
    assert.equal(passed.exit, 0);
    assert.match(passed.stdout, /without a catalog/);
    assert.doesNotMatch(passed.stdout, /dispatches/);
    const bad = path.join(dir, "bad.md");
    writeFileSync(bad, "feature, refactoring: opencode/opencode-go/beam-free variant=low\n");
    assert.equal(runCli([bad]).exit, 1);
  });
});
