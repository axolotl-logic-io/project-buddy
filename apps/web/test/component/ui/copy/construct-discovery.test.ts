import { expect, test } from "vitest";
import { getConstruct, snapshotOf } from "@/constructs/index.ts";
import {
  CONSTRUCT_DISCOVERY_COPY,
  constructPersonality,
} from "@/ui/copy/construct-discovery.ts";

test("both artwork versions identify the same built-in personality", () => {
  for (const id of ["lumen", "vellum"] as const) {
    const snapshot = snapshotOf(getConstruct(id));
    expect(constructPersonality(snapshot)).toEqual(
      CONSTRUCT_DISCOVERY_COPY[id],
    );
    const legacy = {
      ...snapshot,
      definition: {
        ...snapshot.definition,
        visual: {
          version: 1,
          description: snapshot.name,
          canonical: { kind: "built-in", artwork: `${id}-v1` },
        },
      },
    } as const;
    expect(constructPersonality(legacy)).toEqual(CONSTRUCT_DISCOVERY_COPY[id]);
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
