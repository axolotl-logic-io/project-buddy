import { expect, test } from "vitest";
import { getConstruct } from "@/constructs/index.ts";
import {
  CONSTRUCT_DISCOVERY_COPY,
  constructPersonality,
} from "@/ui/copy/construct-discovery.ts";

test("each built-in construct has its own personality copy", () => {
  for (const id of ["lumen", "vellum"] as const) {
    expect(constructPersonality(getConstruct(id))).toEqual(
      CONSTRUCT_DISCOVERY_COPY[id],
    );
  }
});
