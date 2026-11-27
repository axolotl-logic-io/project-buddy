// How a rite picks its replies through a performance (grimoire.md,
// use_case_reply_order and use_case_conclude_rite).

import { describe, expect, test } from "vitest";
import {
  nextReply,
  type ReplyChoice,
  type RiteDefinition,
} from "@/rites/rite.ts";

const RITE: RiteDefinition = {
  name: "Plan",
  firstMessage: "Plan begins.",
  replies: ["First", "Second", "Third"],
  order: "ordered",
  loop: true,
  finalReply: "",
};
// Every reply's place, and one round of messages, one for each reply.
const PLACES: number[] = RITE.replies.map((_reply, place) => place);
const ROUND: number = PLACES.length;

// A random source that always picks the first choice it is offered.
function first(): number {
  return 0;
}

// The choices the rite makes over count messages, each after the replies
// it gave before, drawing on random.
function run(
  rite: RiteDefinition,
  count: number,
  random: () => number = first,
): ReplyChoice[] {
  const given: number[] = [];
  const choices: ReplyChoice[] = [];
  for (let sent = 0; sent < count; sent += 1) {
    const choice = nextReply(rite, given, random);
    choices.push(choice);
    if (choice.kind === "reply") {
      given.push(choice.index);
    }
  }
  return choices;
}

function indexes(choices: readonly ReplyChoice[]): (number | "final")[] {
  return choices.map((choice) => {
    if (choice.kind === "reply") {
      return choice.index;
    }
    return "final";
  });
}

describe("use_case_reply_order", () => {
  test("a rite in order gives its replies from the top, then loops", () => {
    expect(indexes(run(RITE, ROUND * 2 + 1))).toEqual([
      ...PLACES,
      ...PLACES,
      0,
    ]);
  });

  test("a rite without repeats gives every reply once in each round", () => {
    const rite: RiteDefinition = { ...RITE, order: "random-no-repeats" };
    const picks = indexes(run(rite, ROUND * 2, Math.random));
    expect(picks.slice(0, ROUND).toSorted()).toEqual(PLACES);
    expect(picks.slice(ROUND).toSorted()).toEqual(PLACES);
  });

  test("a rite with repeats may give the same reply again", () => {
    const rite: RiteDefinition = { ...RITE, order: "random" };
    expect(indexes(run(rite, ROUND))).toEqual(PLACES.map(() => 0));
  });

  test("the browser's choice stands only when the rite could have made it", () => {
    const proposed: ReplyChoice = { kind: "reply", index: ROUND - 1 };
    expect(
      nextReply({ ...RITE, order: "random" }, [], first, proposed),
    ).toEqual(proposed);
    expect(nextReply(RITE, [], first, proposed)).toEqual({
      kind: "reply",
      index: 0,
    });
    expect(
      nextReply(
        { ...RITE, order: "random-no-repeats" },
        [proposed.index],
        first,
        proposed,
      ),
    ).toEqual({ kind: "reply", index: 0 });
  });
});

test("use_case_conclude_rite", () => {
  const rite: RiteDefinition = { ...RITE, loop: false, finalReply: "Done." };
  expect(indexes(run(rite, ROUND + 1))).toEqual([...PLACES, "final"]);
  const shuffled = indexes(
    run({ ...rite, order: "random-no-repeats" }, ROUND + 1, Math.random),
  );
  expect(shuffled.at(-1)).toBe("final");
});
