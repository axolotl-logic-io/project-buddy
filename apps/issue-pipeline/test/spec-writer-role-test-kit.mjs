// @ts-check
// The spec writer role's machine for issue #7 (#333): its data as locate
// builds it from a saved state, the replies its session gives and the
// readings the role takes from them, and a step through `transition`.
import { locate } from "../src/roles/spec-writer/locate.ts";
import { transition } from "../src/roles/spec-writer/machine.ts";
import { specReadingOf } from "../src/roles/spec-writer/reply.ts";
import { roleContext } from "./role-context-fixtures.mjs";

/** @import { State } from "../src/state.ts" */
/** @import { Step } from "../src/roles/machine.ts" */
/** @import { RoleContext } from "../src/roles/walk.ts" */
/** @import { SpecData, SpecState } from "../src/roles/spec-writer/locate.ts" */
/** @import { SpecResult } from "../src/roles/spec-writer/machine.ts" */
/** @import { SpecInterface, SpecReading } from "../src/roles/spec-writer/reply.ts" */

const SPEC_END = "<!-- end of spec -->";
const SPEC = "## Behaviour\n\n- It works.";
const PRACTICES = ["AGENTS.md", "CONTRIBUTING.md"];

/** @type {SpecInterface} */
const INTERFACE = {
  name: "parseQuota",
  kind: "function",
  where: "src/quota.ts",
  status: "new",
  signature: "parseQuota(text: string): number",
  behaviours: ["It works."],
};

/**
 * A whole reply: a ready spec with one interface, `fields` replacing its
 * fields.
 * @param {Record<string, unknown>} [fields]
 * @returns {Record<string, unknown>} the reply
 */
function replyOf(fields = {}) {
  return {
    decision: "ready",
    spec: `${SPEC}\n\n${SPEC_END}`,
    questions: [],
    files: ["src/quota.ts"],
    subIssues: [],
    interfaces: [INTERFACE],
    noTestsReason: null,
    ...fields,
  };
}

/** @param {string} title @returns {{ title: string, body: string, after: number[], files: string[] }} a part */
function part(title) {
  return { title, body: `${title}'s slice`, after: [], files: [] };
}

/** @param {Record<string, unknown>} fields @param {number} [depth] @returns {SpecReading} the reading of a reply with `fields` */
function readingOf(fields, depth = 0) {
  return specReadingOf(replyOf(fields), depth);
}

/** The readings check-reply and reset route on, by kind. */
const READINGS = {
  ready: readingOf({}),
  "no-work": readingOf({ decision: "no-work" }),
  "needs-info": readingOf({ decision: "needs-info", questions: ["Why?"] }),
  split: readingOf({ decision: "split", subIssues: [part("A"), part("B")] }),
  refused: readingOf({ decision: "split", subIssues: [part("A")] }),
};

/** @param {Partial<RoleContext>} [fields] @returns {RoleContext} issue #7's context, with the practices files set */
function specContext(fields = {}) {
  return { ...roleContext({ practices: PRACTICES }), ...fields };
}

/** @param {State} [saved] @param {RoleContext} [context] @returns {{ at: SpecState, data: SpecData }} where locate starts */
function located(saved = {}, context = specContext()) {
  return locate(saved, context);
}

/** @param {Partial<SpecData>} [fields] @returns {SpecData} a fresh run's data, with `fields` replacing its own */
function dataWith(fields = {}) {
  return { ...located().data, ...fields };
}

/**
 * The step `result` (with `reply`) takes from `at`, with `fields` in data.
 * @param {SpecState} at
 * @param {SpecResult} result
 * @param {unknown} [reply]
 * @param {Partial<SpecData>} [fields]
 * @returns {Step<SpecState, SpecData>} the step
 */
function stepFrom(at, result, reply = null, fields = {}) {
  return transition({ at, data: dataWith(fields) }, { name: result, reply });
}

export {
  dataWith,
  INTERFACE,
  located,
  PRACTICES,
  part,
  READINGS,
  readingOf,
  replyOf,
  SPEC,
  specContext,
  stepFrom,
};
