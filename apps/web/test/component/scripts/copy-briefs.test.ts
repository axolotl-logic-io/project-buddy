import { describe, expect, test } from "vitest";
import { withCopyBrief } from "../../../scripts/copy-briefs.ts";
import { copyCsv } from "../../../scripts/copy-sheet.ts";

describe("writer briefs", (): void => {
  test("explains intent and required placeholders without revealing the source sentence", (): void => {
    const field = withCopyBrief({
      identifier: "ACCOUNT_COPY.nameTooLong",
      words: 7,
      placeholders: ["{{max}}"],
    });
    expect(field.description).toContain("largest allowed number of characters");
    expect(field.description).toContain(
      "Keep these markers exactly as shown: {{max}}",
    );
    const csv = copyCsv([field]);
    expect(csv).toContain('"Description"');
    expect(csv).not.toContain('"Example"');
    expect(csv).not.toContain("A name is at most");
  });

  test("describes ordinary fields without marking them as templates", (): void => {
    const field = withCopyBrief({
      identifier: "ACCOUNT_COPY.nameBraces",
      words: 7,
      placeholders: [],
    });
    expect(field.description).toContain("cannot contain the { or } symbols");
    expect(field.description).not.toContain("Template:");
  });

  test("requires a brief for newly included fields", (): void => {
    expect((): unknown =>
      withCopyBrief({
        identifier: "NEW_COPY.intro",
        words: 4,
        placeholders: [],
      }),
    ).toThrow("Add a writer brief for NEW_COPY.intro");
  });
});
