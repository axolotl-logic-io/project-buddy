import { expect, test } from "vitest";
import { getConstruct, snapshotOf } from "@/constructs/index.ts";
import {
  CONSTRUCT_DISCOVERY_COPY,
  constructPersonality,
} from "@/ui/copy/construct-discovery.ts";

test("each built-in artwork identifies its built-in personality", () => {
  for (const id of ["lumen", "vellum"] as const) {
    expect(constructPersonality(snapshotOf(getConstruct(id)))).toEqual(
      CONSTRUCT_DISCOVERY_COPY[id],
    );
  }
});

test("retaining built-in art does not retain personality claims after conversational edits", () => {
  const vellum = getConstruct("vellum");
  expect(constructPersonality(vellum)).toEqual(CONSTRUCT_DISCOVERY_COPY.vellum);
  const edited = {
    ...vellum,
    name: "Captain Quill",
    definition: { ...vellum.definition, prompt: "Speak like a pirate." },
  };
  expect(constructPersonality(edited)).toEqual(CONSTRUCT_DISCOVERY_COPY.own);
  expect(
    constructPersonality({
      ...edited,
      definition: { ...edited.definition, prompt: "" },
    }),
  ).toEqual(CONSTRUCT_DISCOVERY_COPY.own);
});
