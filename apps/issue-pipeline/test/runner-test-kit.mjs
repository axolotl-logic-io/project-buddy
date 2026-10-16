// @ts-check
// The role runner's test kit: toy roles, and fake effects over a durable
// store and the fake gh. The toy machine has a count-guarded retry loop, a
// session state and a `next` stage; the toy linear script posts, asks a
// session and posts again. Toy ops post signed comments through gh, each with
// its hidden marker, and check the store's markers before acting, so a rerun
// posts nothing twice. killAt makes the k-th effect call (saves included)
// never settle, before or after its durable write; a restart then runs again
// from the store alone, as a job started afresh would.
import { spawnSync } from "node:child_process";
import { runLinear, runMachine } from "../src/job/runner.ts";
import { installFakeGh } from "./fake-gh.mjs";

/** @import { Effects, Outcome, RunEnd } from "../src/job/runner.ts" */
/** @import { Machine, LinearScript } from "../src/roles/walk.ts" */
/** @import { Effect, StateSpec } from "../src/roles/machine.ts" */
/** @import { State } from "../src/state.ts" */

const ISSUE = 7;
const CLOCK = new Date("2026-10-16T12:00:00Z");
const gh = installFakeGh();

/** @typedef {{ tries: number, plan: string | null, scratch: string }} ToyData */

/** @param {string} marker @returns {Effect} */
function post(marker) {
  return { kind: "op", op: "post", payload: { marker, body: `Toy ${marker}` } };
}

/** @type {Effect} */
const WORK = {
  kind: "session",
  name: "work",
  agent: "toy-writer",
  model: "mock",
  schema: { type: "object" },
  task: "Do the toy work.",
  tokenBudget: 1000,
};

/** @param {import("../src/roles/machine.ts").End} end @returns {Effect} */
function ending(end) {
  return { kind: "end", end };
}

/** @param {unknown} reply @returns {string | null} */
function planOf(reply) {
  if (typeof reply === "object" && reply !== null && "plan" in reply) {
    return String(reply.plan);
  }
  return null;
}

/** @type {Record<string, StateSpec<string, string, ToyData>>} */
const TOY_STATES = {
  post: {
    kind: "script",
    effect: () => post("toy-post"),
    on: { ok: { to: "work" } },
  },
  work: {
    kind: "session",
    effect: () => WORK,
    on: {
      replied: {
        to: "verify",
        apply: (data, reply) => ({ ...data, plan: planOf(reply) }),
      },
    },
  },
  verify: {
    kind: "script",
    effect: (data) => ({
      kind: "check",
      check: "verify",
      payload: { tries: data.tries },
    }),
    on: {
      pass: { to: "done" },
      fail: {
        to: "work",
        count: { field: "tries", limit: "maxTries", over: "gave-up" },
      },
      failed: { to: "broken" },
    },
  },
  done: {
    kind: "end",
    effect: () => ending({ kind: "next", stage: "checks" }),
    on: {},
  },
  checks: {
    kind: "script",
    effect: () => post("toy-checks"),
    on: { ok: { to: "finished" } },
  },
  finished: {
    kind: "end",
    effect: () => ending({ kind: "saved", stage: "merge" }),
    on: {},
  },
  "gave-up": {
    kind: "end",
    effect: () => ending({ kind: "stopped", code: "limit" }),
    on: {},
  },
  broken: {
    kind: "end",
    effect: () => ending({ kind: "stopped", code: "broken" }),
    on: {},
  },
};

/** @param {unknown} value @returns {number} */
function countOf(value) {
  if (typeof value === "number") {
    return value;
  }
  return 0;
}

/** @param {State} saved @returns {ToyData} */
function toyData(saved) {
  const { tries } = saved.checkpoints ?? {};
  return { tries: countOf(tries), plan: planOf(saved), scratch: "never saved" };
}

/**
 * The toy machine, with its retry loop bounded by `limits.maxTries`.
 * @param {Readonly<Record<string, number>>} [limits]
 * @returns {Machine<string, string, ToyData>}
 */
function toyMachine(limits = { maxTries: 3 }) {
  return {
    table: { entries: ["post", "checks"], states: TOY_STATES },
    limits,
    locate: (saved) => {
      let at = "post";
      if (saved.stage === "checks") {
        at = "checks";
      }
      return { at, data: toyData(saved) };
    },
    handoff: ["plan"],
    checkpoints: ["tries"],
  };
}

/** @type {LinearScript<ToyData>} */
const TOY_SCRIPT = {
  locate: (saved) => {
    const data = toyData(saved);
    let at = "announce";
    if (data.plan !== null) {
      at = "report";
    }
    return { at, data };
  },
  steps: [
    { name: "announce", kind: "script", effect: () => post("lin-announce") },
    {
      name: "think",
      kind: "session",
      effect: () => WORK,
      apply: (data, reply) => ({ ...data, plan: planOf(reply) }),
    },
    { name: "report", kind: "script", effect: () => post("lin-report") },
  ],
  end: () => ({ kind: "saved", stage: "spec" }),
  handoff: ["plan"],
  checkpoints: [],
};

/** @returns {State} */
function startState() {
  return {
    version: 1,
    number: ISSUE,
    stage: "implement",
    lease: { holder: "job" },
    plan: null,
  };
}

/**
 * @typedef {object} WorldOptions
 * @property {Readonly<Record<string, string>>} [failOp] an error for each op that fails
 * @property {(tries: number) => string} [verify] the verify check's result
 * @property {boolean} [verifyFails] whether the verify check fails outright
 * @property {number} [signalAt] the call during which SIGTERM arrives
 */

/** @typedef {{ kind: string, name: string, state?: State }} Call */
/** @typedef {{ reply: Outcome, write?: () => void }} Act */
/** @typedef {{ k: number, when: "before" | "after" }} Kill */
/** @typedef {{ saved: State, markers: Set<string> }} Store */

/** @param {string} marker @param {string} body */
function postComment(marker, body) {
  const text = `${body}\n<!-- issue-pipeline:${ISSUE}:${marker} -->`;
  spawnSync("gh", ["issue", "comment", String(ISSUE), "--body", text]);
}

/** @param {unknown} value @returns {string} */
function textOf(value) {
  return String(value);
}

/** @param {Store} store @param {WorldOptions} options @param {import("../src/job/runner.ts").OpEffect} effect @returns {Act} */
function opAct(store, options, effect) {
  const { [effect.op]: error } = options.failOp ?? {};
  if (error !== undefined) {
    return { reply: { ok: false, error } };
  }
  const marker = textOf(effect.payload["marker"]);
  return {
    write: () => {
      if (!store.markers.has(marker)) {
        postComment(marker, textOf(effect.payload["body"]));
        store.markers.add(marker);
      }
    },
    reply: { ok: true, name: "ok", reply: { ok: true } },
  };
}

/** @param {WorldOptions} options @param {import("../src/job/runner.ts").CheckEffect} effect @returns {Act} */
function checkAct(options, effect) {
  if (options.verifyFails === true) {
    return { reply: { ok: false, error: "verify broke" } };
  }
  const verify = options.verify ?? (() => "pass");
  const name = verify(countOf(effect.payload["tries"]));
  return { reply: { ok: true, name, reply: null } };
}

/**
 * A world: the durable store, the calls made, and fresh effects over it.
 * @param {WorldOptions} [options]
 */
function world(options = {}) {
  /** @type {Store} */
  const store = { saved: startState(), markers: new Set() };
  /** @type {Call[]} */
  const calls = [];
  /** @type {"SIGTERM" | null} */
  let signal = null;
  /**
   * Effects whose k-th call never settles, after its write when `when` is
   * "after"; `killed` resolves then.
   * @param {Kill} [kill]
   * @returns {{ effects: Effects, killed: Promise<"killed"> }}
   */
  function effects(kill) {
    let count = 0;
    const { promise: killed, resolve } = Promise.withResolvers();
    /** @param {Call} entry @param {Act} act @returns {Promise<Outcome>} */
    function run(entry, act) {
      count += 1;
      calls.push(entry);
      if (kill?.k === count) {
        if (kill.when === "after") {
          act.write?.();
        }
        resolve("killed");
        return new Promise(() => undefined);
      }
      act.write?.();
      if (options.signalAt === count) {
        signal = "SIGTERM";
      }
      return Promise.resolve(act.reply);
    }
    const ok = { ok: true, name: "ok", reply: null };
    /** @type {Effects} */
    const all = {
      op: (effect) =>
        run({ kind: "op", name: effect.op }, opAct(store, options, effect)),
      check: (effect) =>
        run({ kind: "check", name: effect.check }, checkAct(options, effect)),
      session: (effect) =>
        run(
          { kind: "session", name: effect.name },
          { reply: { ok: true, name: "replied", reply: { plan: "toy plan" } } },
        ),
      save: (state) =>
        run(
          { kind: "save", name: "save", state },
          {
            write: () => {
              store.saved = structuredClone(state);
            },
            reply: ok,
          },
        ),
      clock: () => CLOCK,
      stopping: () => signal,
      step: () => undefined,
    };
    return { effects: all, killed };
  }
  return { store, calls, effects };
}

/** @typedef {ReturnType<typeof world>} World */

/**
 * Runs `role` ("machine" or "linear") from the store's state.
 * @param {"machine" | "linear"} role
 * @param {World} place
 * @param {Effects} effects
 * @param {Machine<string, string, ToyData>} [machine]
 * @returns {Promise<RunEnd>}
 */
function runToy(role, place, effects, machine = toyMachine()) {
  const { saved } = place.store;
  const entry = { stage: String(saved.stage), saved };
  if (role === "machine") {
    return runMachine(machine, entry, effects);
  }
  return runLinear(TOY_SCRIPT, entry, effects);
}

/** @returns {string[][]} the gh calls that changed GitHub */
function writes() {
  return gh.writes(() => false);
}

/**
 * The end, saved state and gh writes of a run of `role` killed at its k-th
 * effect and started again from the store, or of one never killed.
 * @param {"machine" | "linear"} role
 * @param {{ k: number, when: "before" | "after" }} [kill]
 */
async function killAt(role, kill) {
  gh.reply([]);
  const place = world();
  const first = place.effects(kill);
  let end = await Promise.race([
    runToy(role, place, first.effects),
    first.killed,
  ]);
  if (end === "killed") {
    end = await runToy(role, place, place.effects().effects);
  }
  return {
    end,
    saved: place.store.saved,
    writes: writes(),
    calls: place.calls,
  };
}

/** @param {"machine" | "linear"} role */
function uninterrupted(role) {
  return killAt(role);
}

export {
  gh,
  killAt,
  runToy,
  TOY_SCRIPT,
  toyMachine,
  uninterrupted,
  world,
  writes,
};
