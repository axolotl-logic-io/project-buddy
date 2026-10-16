// @ts-check
// What a list of gh writes (fake-gh's writes()) shows on GitHub, named so a
// test can check the effects a promise names without copying gh's argv or a
// comment's full text: which issue or PR gets a comment, which comment is
// edited, which labels are added or removed. A comment is named by the role
// in its `agent-pipeline:comment role=` marker, or as the state comment.

const ISSUE_COMMENTS = /^repos\/[^/]+\/[^/]+\/issues\/(?<n>\d+)\/comments$/u;
const COMMENT = /^repos\/[^/]+\/[^/]+\/issues\/comments\/(?<id>\d+)$/u;
const ISSUE_LABELS =
  /^repos\/[^/]+\/[^/]+\/issues\/(?<n>\d+)\/labels(?:\/(?<name>.+))?$/u;
const ROLE = /<!-- agent-pipeline:comment role=(?<role>[\w-]+) -->/u;
const STATE = /<!-- agent-pipeline:state\n(?<json>.*)\n-->/u;
const LABEL_EFFECT = /^(?:un)?label /u;
const BODY_FIELD = "body=";
const LABEL_FIELD = "labels[]=";

/**
 * One write's effect: its name, and the comment text it posts, if any.
 * @typedef {object} GhEffect
 * @property {string} effect
 * @property {string} body
 */

/** @param {readonly string[]} args @param {string} prefix @returns {string} */
function field(args, prefix) {
  const found = args.find((arg) => arg.startsWith(prefix));
  if (found === undefined) {
    return "";
  }
  return found.slice(prefix.length);
}

/** @param {string} body @returns {string} */
function kindOf(body) {
  const role = ROLE.exec(body)?.groups?.role;
  if (role !== undefined) {
    return ` role=${role}`;
  }
  if (STATE.test(body)) {
    return " state";
  }
  return "";
}

/** @param {readonly string[]} args @returns {string} */
function nameOf(args) {
  const endpoint = args.find((arg) => arg.startsWith("repos/")) ?? "";
  const body = field(args, BODY_FIELD);
  const posted = ISSUE_COMMENTS.exec(endpoint)?.groups?.n;
  if (posted !== undefined && args.includes("POST")) {
    return `comment #${posted}${kindOf(body)}`;
  }
  const edited = COMMENT.exec(endpoint)?.groups?.id;
  if (edited !== undefined && args.includes("PATCH")) {
    return `edit comment ${edited}${kindOf(body)}`;
  }
  const labels = ISSUE_LABELS.exec(endpoint)?.groups;
  if (labels?.name !== undefined && args.includes("DELETE")) {
    return `unlabel #${labels.n} ${decodeURIComponent(labels.name)}`;
  }
  if (labels !== undefined && args.includes("POST")) {
    return `label #${labels.n} ${field(args, LABEL_FIELD)}`;
  }
  return args.filter((arg) => !arg.startsWith(BODY_FIELD)).join(" ");
}

/** @param {readonly string[][]} writes @returns {GhEffect[]} */
function effectsOf(writes) {
  return writes.map((args) => ({
    effect: nameOf(args),
    body: field(args, BODY_FIELD),
  }));
}

// The effects' names, sorted, so a check doesn't pin the order of the writes.
// A label added or removed twice is named once: GitHub shows no difference.
/** @param {readonly GhEffect[]} effects @returns {string[]} */
function effectNames(effects) {
  const names = effects.map(({ effect }) => effect);
  const once = names.filter(
    (name, at) => !LABEL_EFFECT.test(name) || names.indexOf(name) === at,
  );
  return once.sort();
}

// The text of the first write named `name`; throws if there is none.
/** @param {readonly GhEffect[]} effects @param {string} name @returns {string} */
function bodyOf(effects, name) {
  const found = effects.find(({ effect }) => effect === name);
  if (found === undefined) {
    throw new Error(`no ${name} among ${effectNames(effects).join(", ")}`);
  }
  return found.body;
}

// The state the first write named `name` saves.
/** @param {readonly GhEffect[]} effects @param {string} name @returns {unknown} */
function stateOf(effects, name) {
  const json = STATE.exec(bodyOf(effects, name))?.groups?.json;
  if (json === undefined) {
    throw new Error(`${name} saves no state`);
  }
  return JSON.parse(json);
}

export { bodyOf, effectNames, effectsOf, stateOf };
