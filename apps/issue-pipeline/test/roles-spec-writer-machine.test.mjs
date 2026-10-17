// @ts-check
// The spec writer role's machine (#333): every edge of the wiki's Lifecycle
// table as a state and a result, the table's faults, the retry limit, where
// locate starts a run, the session's task, and that the role's modules
// import no other role. Ported from the spec stage's tests where they
// overlap (workflow-stages-spec-next, -retry-next and -split-next).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { checkTable } from "../src/roles/machine.ts";
import { roleOf } from "../src/roles/registry.ts";
import {
  LIMITS,
  specWriterMachine,
  TABLE,
  transition,
} from "../src/roles/spec-writer/machine.ts";
import {
  EDGES,
  ISSUE,
  nameOf,
  stoppedWith,
} from "./spec-writer-edge-fixtures.mjs";
import { dataWith, stepFrom } from "./spec-writer-role-test-kit.mjs";

/** @import { Effect } from "../src/roles/machine.ts" */
/** @import { SpecData, SpecState } from "../src/roles/spec-writer/locate.ts" */

const FAILED_TWICE = "the spec writer failed twice";
const ROLE_DIR = path.join(import.meta.dirname, "..", "src", "roles");
const SPEC_WRITER_DIR = path.join(ROLE_DIR, "spec-writer");
const IMPORT_FROM = /from "(?<spec>[^"]+)"/gu;
const ROLE_MODULES = ["locate.ts", "machine.ts", "reply.ts", "task.ts"];

test("every edge of the table gives its next state, effect and data", () => {
  for (const edge of EDGES) {
    const label = `${edge.at} ${edge.result}`;
    const step = stepFrom(edge.at, edge.result, edge.reply, edge.data);
    assert.equal(step.state.at, edge.next, label);
    assert.deepEqual(nameOf(step.effect), edge.effect, label);
    for (const [field, value] of Object.entries(edge.changes ?? {})) {
      assert.deepEqual(
        new Map(Object.entries(step.state.data)).get(field),
        value,
        `${label} ${field}`,
      );
    }
  }
});

/** @param {Effect} effect @returns {unknown[]} the issue its payload names, for an op or a check */
function issuesOf(effect) {
  if (effect.kind !== "op" && effect.kind !== "check") {
    return [];
  }
  const { number } = effect.payload;
  return [number];
}

test("every op and check names the issue in its payload", () => {
  const named = EDGES.flatMap((edge) =>
    issuesOf(stepFrom(edge.at, edge.result, edge.reply, edge.data).effect),
  );
  assert.ok(named.length > 0);
  assert.deepEqual(new Set(named), new Set([ISSUE]));
});

test("only the session runs a model, and every listed edge is covered", () => {
  const states = new Map(Object.entries(TABLE.states));
  for (const [name, spec] of states) {
    assert.equal(spec.kind === "session", name === "session", name);
    for (const result of Object.keys(spec.on)) {
      const listed = EDGES.some(
        (edge) => edge.at === name && edge.result === result,
      );
      assert.ok(listed, `${name} ${result}`);
    }
  }
  assert.deepEqual(TABLE.entries, ["claim", "open-pr", "close-old-pr"]);
});

test("the table has no faults, and transition throws on a result a state doesn't list", () => {
  assert.deepEqual(checkTable(TABLE, LIMITS, dataWith()), []);
  /** @type {{ at: SpecState, data: SpecData }} */
  const state = { at: "claim", data: dataWith() };
  const before = structuredClone(state);
  assert.throws(() => transition(state, { name: "replied", reply: null }));
  assert.deepEqual(state, before);
});

test("retry and checkout run at most 2 sessions, then stop with the spec writer failed twice", () => {
  assert.deepEqual(LIMITS, { specAttempts: 2 });
  for (const at of /** @type {SpecState[]} */ (["retry", "checkout"])) {
    for (const attempts of [0, 1]) {
      const step = stepFrom(at, "ok", {}, { attempts });
      assert.equal(step.state.at, "session", `${at} ${attempts}`);
      assert.equal(step.state.data.attempts, attempts + 1);
      assert.ok(step.effect.kind === "session");
      assert.equal(step.effect.attempt, attempts + 1);
    }
    const over = stepFrom(at, "ok", {}, { attempts: 2, checkOutput: "lint" });
    assert.equal(over.state.at, "failed-twice", at);
    assert.deepEqual(nameOf(over.effect), stoppedWith(FAILED_TWICE, "lint"));
  }
});

test("checkout keeps the start heads an earlier start saved", () => {
  const reply = { startSha: "new", startWikiSha: "new-wiki" };
  const step = stepFrom("checkout", "ok", reply, {
    startSha: null,
    startWikiSha: "w0",
  });
  assert.equal(step.state.data.startSha, null);
  assert.equal(step.state.data.startWikiSha, "w0");
});

test("the machine hands off the spec's fields and checkpoints its start heads and attempts", () => {
  assert.deepEqual(
    new Set(specWriterMachine.handoff),
    new Set([
      "spec",
      "specFile",
      "files",
      "interfaces",
      "specTestsSha",
      "noTestsReason",
    ]),
  );
  assert.deepEqual(
    new Set(specWriterMachine.checkpoints),
    new Set(["startSha", "startWikiSha", "attempts"]),
  );
  assert.equal(specWriterMachine.table, TABLE);
  assert.equal(specWriterMachine.limits, LIMITS);
});

/** @param {string} file @returns {string[]} its imports that reach into another role's folder */
function foreignImports(file) {
  const found = [];
  for (const match of readFileSync(file, "utf8").matchAll(IMPORT_FROM)) {
    const { spec = "" } = match.groups ?? {};
    const target = path.resolve(path.dirname(file), spec);
    const parts = path.relative(ROLE_DIR, target).split(path.sep);
    const [top] = parts;
    if (parts.length > 1 && top !== ".." && top !== "spec-writer") {
      found.push(`${path.basename(file)} imports ${parts.join("/")}`);
    }
  }
  return found;
}

test("the spec writer role imports no other role's modules, and isn't registered", () => {
  const files = readdirSync(SPEC_WRITER_DIR).filter((file) =>
    file.endsWith(".ts"),
  );
  for (const module of ROLE_MODULES) {
    assert.ok(files.includes(module), module);
  }
  const found = files.flatMap((file) =>
    foreignImports(path.join(SPEC_WRITER_DIR, file)),
  );
  assert.deepEqual(found, []);
  assert.equal(roleOf("spec"), undefined);
});
