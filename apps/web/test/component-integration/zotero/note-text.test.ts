// A Zotero note's text: tidying what someone types, writing it as the
// plain HTML Zotero keeps, and reading Zotero's HTML back as text.
import { describe, expect, test } from "vitest";
import { noteFromHtml, noteHtml, tidyNote } from "@/zotero/note-text.ts";

describe("tidyNote", () => {
  test("trims, ends lines the same way and keeps at most one blank line", () => {
    expect(tidyNote("  First  \r\nsecond \n\n\n\nthird  ")).toBe(
      "First\nsecond\n\nthird",
    );
  });
});

describe("noteHtml and noteFromHtml", () => {
  test("a plain note goes to Zotero as paragraphs and comes back the same", () => {
    const text = 'Irony & "free" <indirect>\n\nspeech';
    const html = noteHtml(text);
    expect(html).toBe(
      "<p>Irony &amp; &quot;free&quot; &lt;indirect&gt;</p><p></p><p>speech</p>",
    );
    expect(noteFromHtml(html)).toEqual({ text, plain: true });
  });

  test("Zotero's schema wrapper leaves a note plain", () => {
    expect(
      noteFromHtml(
        [
          '<div data-schema-version="9">',
          "<p>One</p>\n<p>Two</p>",
          "</div>",
        ].join(""),
      ),
    ).toEqual({ text: "One\nTwo", plain: true });
  });

  test("a note with formatting reads as its text and isn't plain", () => {
    expect(
      noteFromHtml(
        "<h1>Title</h1><p>Some <b>bold</b><br>words</p><ul><li>a</li></ul>",
      ),
    ).toEqual({ text: "Title\nSome bold\nwords\na", plain: false });
  });
});
