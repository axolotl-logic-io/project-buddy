import { describe, expect, test } from "vitest";
import { CITATION_RULES } from "@/tutor/citation-prompt.ts";
import { CITE_MANUAL_TOOL } from "@/tutor/tools/cite-manual-contract.ts";
import { SEARCH_MANUAL_TOOL } from "@/tutor/tools/search-manual-contract.ts";

const SHE_OR_HER = /\b(?:she|her)\b/iu;

describe("CITATION_RULES", () => {
  test("names the search and citation tools by their registered names", () => {
    expect(CITATION_RULES).toContain(`\`${SEARCH_MANUAL_TOOL}\``);
    expect(CITATION_RULES).toContain(`\`${CITE_MANUAL_TOOL}\``);
  });

  test("calls the person the user", () => {
    expect(CITATION_RULES).toContain("the user");
    expect(CITATION_RULES).not.toMatch(SHE_OR_HER);
  });
});
