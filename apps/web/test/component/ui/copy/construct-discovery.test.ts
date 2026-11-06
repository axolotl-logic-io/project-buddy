import { expect, test } from "vitest";
import { getConstruct } from "@/constructs/index.ts";
import {
  CONSTRUCT_DISCOVERY_COPY,
  constructPersonality,
} from "@/ui/copy/construct-discovery.ts";

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
