import { describe, expect, test } from "vitest";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

describe("CITATION_RULES", () => {
  test("names the search and citation tools by their registered names", () => {
    expect(CITATION_RULES).toContain(`\`${SEARCH_MANUAL_TOOL}\``);
    expect(CITATION_RULES).toContain(`\`${CITE_MANUAL_TOOL}\``);
  });

  test("covers topics the manual lacks and questions outside Blender", () => {
    expect(CITATION_RULES).toContain("does not cover");
    expect(CITATION_RULES).toContain("nothing to do with Blender");
  });
});
