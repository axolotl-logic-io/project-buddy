// Zotero's bibliography HTML as the Works Cited entries Project Buddy shows,
// the order it lists them in, and how a search matches them.
import { describe, expect, test } from "vitest";
import {
  entryFromBib,
  entryHolds,
  inWorksCitedOrder,
  plainText,
} from "@/zotero/works-cited.ts";

// An entry as Zotero's MLA bib HTML wraps it.
function bib(entry: string): string {
  return `<div class="csl-bib-body" style="line-height: 2; padding-left: 1em; text-indent:-1em;">
  <div class="csl-entry">${entry}</div>
</div>`;
}

describe("entryFromBib", () => {
  test("keeps the text and italics of Zotero's entry", () => {
    expect(
      entryFromBib(
        bib(
          "Austen, Jane. <i>Emma</i>. Edited by Fiona Stafford, Penguin, 2003.",
        ),
      ),
    ).toEqual([
      { text: "Austen, Jane. ", italic: false },
      { text: "Emma", italic: true },
      { text: ". Edited by Fiona Stafford, Penguin, 2003.", italic: false },
    ]);
  });

  test("reads italics from em, cite and font-style spans, nested", () => {
    expect(
      entryFromBib(
        bib(
          '<em>Outer <span style="font-style:normal">Inner</span> rest</em> and <span style="font-style: italic">styled</span> <cite>cited</cite>.',
        ),
      ),
    ).toEqual([
      { text: "Outer ", italic: true },
      { text: "Inner", italic: false },
      { text: " rest", italic: true },
      { text: " and ", italic: false },
      { text: "styled", italic: true },
      { text: " ", italic: false },
      { text: "cited", italic: true },
      { text: ".", italic: false },
    ]);
  });

  test("decodes entities and drops markup, scripts' tags included", () => {
    const entry = entryFromBib(
      bib(
        [
          "Smith &amp; Jones.",
          "&#8220;Title&#x201D;",
          "&nbsp;",
          "&mdash;",
          "<script>x</script>",
          "<b>bold</b>",
          "&bogus; &#99999999;",
        ].join(" "),
      ),
    );
    expect(plainText(entry)).toBe(
      "Smith & Jones. “Title” — x bold &bogus; &#99999999;",
    );
    expect(entry.every(({ italic }) => !italic)).toBe(true);
  });

  test("an empty bib makes an empty entry", () => {
    expect(entryFromBib("")).toEqual([]);
    expect(entryFromBib(bib(""))).toEqual([]);
  });
});

function reference(
  key: string,
  text: string,
): { key: string; entry: { text: string; italic: boolean }[] } {
  return { key, entry: [{ text, italic: false }] };
}

describe("inWorksCitedOrder", () => {
  test("orders by opening words, skipping quotation marks and articles", () => {
    const ordered = inWorksCitedOrder([
      reference("K1", "Zola, Émile. Germinal."),
      reference("K2", "The Wanderer. Anonymous Press, 1850."),
      reference("K3", "“A Study in Red.” Magazine, 1900."),
      reference("K4", "Émile, Jean. Book."),
      reference("K5", "austen, Jane. Emma."),
      reference("K6", "Article 10 of Something."),
      reference("K7", "Article 9 of Something."),
    ]);
    // Numbers sort by value, and "Article" is no article.
    expect(ordered.map(({ key }) => key)).toEqual([
      "K7",
      "K6",
      "K5",
      "K4",
      "K3",
      "K2",
      "K1",
    ]);
  });

  test("entries that read alike keep one order by key", () => {
    const same = "Baldwin, James. Giovanni's Room.";
    expect(
      inWorksCitedOrder([reference("B", same), reference("A", same)]).map(
        ({ key }) => key,
      ),
    ).toEqual(["A", "B"]);
  });
});

describe("entryHolds", () => {
  test("matches the entry's text, ignoring case and the search's spaces", () => {
    const entry = entryFromBib(bib("Austen, Jane. <i>Emma</i>. Penguin."));
    expect(entryHolds(entry, "  jane. EMMA ")).toBe(true);
    expect(entryHolds(entry, "Beloved")).toBe(false);
  });
});
