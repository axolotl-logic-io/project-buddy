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

  test("covers topics the manual lacks and questions outside Blender", () => {
    expect(CITATION_RULES).toContain("does not cover");
    expect(CITATION_RULES).toContain("nothing to do with Blender");
  });

  test("asks for the reply after the last tool call, and lets citing come first", () => {
    expect(CITATION_RULES).toContain(
      "Write your whole reply to the user after your last tool call.",
    );
    expect(CITATION_RULES).not.toContain("after your reply's text");
    expect(CITATION_RULES).not.toContain("write nothing after it");
  });

  test("puts the citation links under the reply's text, as cite_manual's description does", () => {
    expect(CITATION_RULES).toContain(
      "The app shows them as links under your reply's text; they don't replace it.",
    );
    expect(CITATION_RULES).not.toContain("always shows them");
  });

  test("calls the person the user", () => {
    expect(CITATION_RULES).toContain("the user");
    expect(CITATION_RULES).not.toMatch(SHE_OR_HER);
  });
});
