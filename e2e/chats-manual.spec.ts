// "Chats and the manual" in USE_CASES.md. The mock tutor's `/mock-search
// <query>` searches the sections a test adds, cites them, then replies with
// each one found; `/mock-empty-after-search <query>` searches and cites, then
// ends without text, and answers when the app asks again. Each test's
// sections use words no other test uses.
import { expect, type Locator, type Page } from "@playwright/test";
import type { Chat } from "@/chats/store.ts";
import type { ManualSection } from "@/manual/manual-sections.ts";
import { manualUrl } from "@/manual/manual-source.ts";
import { mockEmptyAfterSearchAnswer } from "@/tutor/mock-empty-after-search.ts";
import { CITATIONS_COPY } from "@/ui/copy/chat.ts";
import {
  chatMessages,
  citations,
  lastMessage,
  openChat,
  sendMessage,
  stubManualSite,
} from "./chat-page.ts";
import { test } from "./fixtures.ts";
import { logIn } from "./log-in.ts";

function manualSection(
  page: string,
  anchor: string,
  title: string,
  text: string,
): ManualSection {
  const filePath = `manual/${page}.rst`;
  return { title, text, filePath, anchor, url: manualUrl(filePath, anchor) };
}

const FLOOBLE = manualSection(
  "modeling/meshes/editing/edge/flooble",
  "flooble-edges",
  "Flooble Edges",
  "Press Ctrl-Shift-F to flooble the selected edges.",
);
const FLOOBLE_WIDTH = manualSection(
  "modeling/meshes/editing/edge/flooble",
  "flooble-width",
  "Flooble Width",
  "Drag the mouse to set the flooble width.",
);
const FLOOBLE_WIDTH_LABEL: string = `${FLOOBLE.title} › ${FLOOBLE_WIDTH.title}`;

// Her two questions and one reply to each: no second answer.
const MESSAGES_AFTER_TWO_QUESTIONS = 4;

// The links to the manual under one message.
function citationsIn(message: Locator): Locator {
  return message.getByRole("region", { name: CITATIONS_COPY.heading });
}

// Checks that the last reply is the mock's one answer to
// `/mock-empty-after-search flooble`, naming both sections, with both links.
async function expectAnswerAfterEmptyStep(page: Page): Promise<void> {
  const reply = lastMessage(page);
  const answer = mockEmptyAfterSearchAnswer("flooble", [
    FLOOBLE.title,
    FLOOBLE_WIDTH_LABEL,
  ]);
  await expect(reply.getByText(answer)).toHaveCount(1);
  await expect(reply.getByText(answer)).toBeVisible();
  await expect(citationsIn(reply).getByRole("link")).toHaveText([
    FLOOBLE.title,
    FLOOBLE_WIDTH_LABEL,
  ]);
  await expect(chatMessages(page)).toHaveCount(MESSAGES_AFTER_TWO_QUESTIONS);
}

test("use_case_ask_blender_question", async ({ page, testData }) => {
  await testData.manualSections([FLOOBLE, FLOOBLE_WIDTH]);
  const chat = await testData.chat(await testData.project());
  await openChat(page, chat);

  await test.step("the tutor looks the topic up and answers from the manual", async () => {
    await sendMessage(page, "/mock-search flooble");

    await expect(
      page.getByText(CITATIONS_COPY.searched("flooble")),
    ).toBeVisible();
    await expect(page.getByText(FLOOBLE.text)).toBeVisible();
    await expect(page.getByText(FLOOBLE_WIDTH.text)).toBeVisible();
  });

  await test.step("under the answer, each section looked up is a link", async () => {
    const links = citations(page).getByRole("link");
    await expect(links).toHaveText([FLOOBLE.title, FLOOBLE_WIDTH_LABEL]);
    const answer = await page.getByText(FLOOBLE_WIDTH.text).boundingBox();
    const sources = await citations(page).boundingBox();
    expect(sources?.y).toBeGreaterThan(answer?.y ?? Number.POSITIVE_INFINITY);
  });

  await test.step("the links are still there after she reopens the chat", async () => {
    await page.reload();

    await expect(citations(page).getByRole("link")).toHaveText([
      FLOOBLE.title,
      FLOOBLE_WIDTH_LABEL,
    ]);
  });

  await test.step("the answer arrives, once, even when the tutor's searches end without text", async () => {
    await sendMessage(page, "/mock-empty-after-search flooble");

    await expect(
      lastMessage(page).getByText(CITATIONS_COPY.searched("flooble")),
    ).toBeVisible();
    await expectAnswerAfterEmptyStep(page);
  });

  await test.step("that answer is still there after she reopens the chat", async () => {
    await page.reload();

    await expectAnswerAfterEmptyStep(page);
  });
});

const SPLONK = manualSection(
  "modeling/modifiers/generate/splonk",
  "splonk-modifier",
  "Splonk Modifier",
  "Add the Splonk modifier from the Generate menu.",
);

test("use_case_follow_citation", async ({ page, testData }) => {
  await testData.manualSections([SPLONK]);
  await stubManualSite(page);
  const chat = await testData.chat(await testData.project());
  await openChat(page, chat);
  await sendMessage(page, "/mock-search splonk");
  const link = citations(page).getByRole("link", { name: SPLONK.title });

  await test.step("the link leads to the section in the latest manual", async () => {
    await expect(link).toHaveAttribute(
      "href",
      "https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/splonk.html#splonk-modifier",
    );
  });

  await test.step("opening it goes straight to the manual, in a new tab", async () => {
    const manualTab = page.waitForEvent("popup");
    await link.click();

    expect((await manualTab).url()).toBe(SPLONK.url);
  });
});

test("use_case_topic_not_in_manual", async ({ page, testData }) => {
  const chat = await testData.chat(await testData.project());
  await openChat(page, chat);

  await test.step("the tutor says the manual has nothing, with no links", async () => {
    await sendMessage(page, "/mock-search quuxplorp");

    await expect(
      page.getByText('The manual has nothing on "quuxplorp"', { exact: false }),
    ).toBeVisible();
    await expect(citations(page)).toHaveCount(0);
  });

  await test.step("a section the tutor never looked up is never cited", async () => {
    await sendMessage(
      page,
      `/mock-tool cite_manual {"urls":["${manualUrl("manual/addons/quuxplorp.rst", "quuxplorp")}"]}`,
    );

    await expect(
      page.getByText("The mock tutor called cite_manual."),
    ).toBeVisible();
    await expect(citations(page)).toHaveCount(0);
  });
});

const WIBBLE = manualSection(
  "sculpt_paint/sculpting/tools/wibble",
  "wibble-brush",
  "Wibble Brush",
  "Pick the Wibble brush from the toolbar.",
);

test("use_case_ask_outside_blender", async ({ page, testData }) => {
  await testData.manualSections([WIBBLE]);
  const chat = await testData.chat(await testData.project());
  await openChat(page, chat);

  await test.step("a question outside Blender gets a reply with no manual links", async () => {
    await sendMessage(page, "What goes into pancake batter?");

    await expect(
      page.getByText('You said: "What goes into pancake batter?"', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(citations(page)).toHaveCount(0);
  });

  await test.step("her next Blender question is answered with its links", async () => {
    await sendMessage(page, "/mock-search wibble");

    await expect(citations(page).getByRole("link")).toHaveText([WIBBLE.title]);
  });
});

const GRONK = manualSection(
  "modeling/meshes/editing/vertex/gronk",
  "gronk-vertices",
  "Gronk Vertices",
  "Open Vertex > Gronk, then press G to gronk.",
);

// The answer and the citation links a persona gives to `/mock-search gronk`.
async function gronkAnswer(
  page: Page,
  chat: Chat,
): Promise<{ answer: string; links: (string | null)[] }> {
  await page.goto(`/chats/${chat.id}`);
  await sendMessage(page, "/mock-search gronk");
  const links = citations(page).getByRole("link");
  await expect(links).toHaveCount(1);
  const answer = page.getByRole("listitem").filter({ hasText: GRONK.text });
  return {
    answer: (await answer.getByText(GRONK.text).textContent()) ?? "",
    links: await links.evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href")),
    ),
  };
}

test("use_case_same_facts_any_persona", async ({ page, testData }) => {
  await testData.manualSections([GRONK]);
  const project = await testData.project();
  const hippyChat = await testData.chat(project, "hippy");
  const otherPersonaChat = await testData.chat(project, "mr-tee");
  await logIn(page);

  const hippy = await gronkAnswer(page, hippyChat);
  const otherPersona = await gronkAnswer(page, otherPersonaChat);

  expect(hippy.answer).toContain(GRONK.text);
  expect(otherPersona.answer).toBe(hippy.answer);
  expect(hippy.links).toEqual([GRONK.url]);
  expect(otherPersona.links).toEqual(hippy.links);
});
