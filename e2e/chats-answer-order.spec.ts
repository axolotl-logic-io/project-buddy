// Where the citations sit in a manual answer, and what they are called. The
// mock tutor's `/mock-search` cites before it writes, as Claude may, and the
// links must still show under the prose. Sections come from RST pages, so
// each page's title is its first heading, as in the real manual.
import { expect, type Locator, type Page } from "@playwright/test";
import { manualSectionsFromRst } from "@/manual/manual-sections.ts";
import { COPY } from "@/ui/copy.ts";
import { sendMessage } from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

const BLORP_TOOL_PAGE = manualSectionsFromRst(
  "manual/modeling/meshes/editing/edge/blorp.rst",
  [
    "***********",
    "Blorp Edges",
    "***********",
    "",
    "Blorp the selected edges.",
    "",
    "Options",
    "=======",
    "",
    "Set the blorpify amount in the tool's panel.",
  ].join("\n"),
);
const BLORP_MODIFIER_PAGE = manualSectionsFromRst(
  "manual/modeling/modifiers/generate/blorp.rst",
  [
    "**************",
    "Blorp Modifier",
    "**************",
    "",
    "Blorps a whole mesh.",
    "",
    "Options",
    "=======",
    "",
    "Set the blorpify amount in the modifier's panel.",
  ].join("\n"),
);
const TOOL_OPTIONS_TEXT = "Set the blorpify amount in the tool's panel.";

function citations(page: Page): Locator {
  return page.getByRole("region", { name: COPY.citations.heading });
}

// Whether the citations come after element in the page.
function citationsFollow(element: Locator): Promise<boolean> {
  return element.evaluate(
    (node: Element, heading: string): boolean =>
      [...document.querySelectorAll("section")].some(
        (section) =>
          section.textContent?.startsWith(heading) === true &&
          node.compareDocumentPosition(section) ===
            Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    COPY.citations.heading,
  );
}

test("use_case_ask_blender_question", async ({ page, testData }) => {
  await testData.manualSections([...BLORP_TOOL_PAGE, ...BLORP_MODIFIER_PAGE]);
  const chat = await testData.chat(await testData.project());
  await logIn(page);
  await page.goto(`/chats/${chat.id}`);
  await sendMessage(page, "/mock-search blorpify");
  const answer = page.getByText(TOOL_OPTIONS_TEXT);

  await test.step("the links show under the answer, though it cited first", async () => {
    await expect(answer).toBeVisible();
    await expect(citations(page)).toBeVisible();
    expect(await citationsFollow(answer)).toBe(true);
  });

  await test.step("each link names its page and heading, so two Options differ", async () => {
    const links = citations(page).getByRole("link");
    await expect(links).toHaveCount(2);
    await expect(
      links.filter({ hasText: "Blorp Edges › Options" }),
    ).toBeVisible();
    await expect(
      links.filter({ hasText: "Blorp Modifier › Options" }),
    ).toBeVisible();
  });

  await test.step("the links are still under the answer after she reopens the chat", async () => {
    await page.reload();

    await expect(answer).toBeVisible();
    expect(await citationsFollow(answer)).toBe(true);
  });
});
