// A chat page with one of everything a reply shows: a search with its
// citations, a working note, a memory change, a tool that failed, and
// Markdown with a heading. The chat is stored through the chat store as it
// would be saved after her five commands to the mock tutor and its reply to
// each, and the shot is of the chat as it opens from the database. What
// the replies save is checked elsewhere:
// src/app/api/chat/manual-answers.server.test.ts (the search and its
// citations) and src/app/api/chat/reply-failures.server.test.ts (the
// working note and the failed tool). The memory change is
// src/components/chat/memory-change-part.test.tsx's and
// src/tutor/interview.server.test.ts's; the Markdown is
// src/components/chat/chat-message.browser.test.tsx's.
import { expect, type Page } from "@playwright/test";
import type { UIMessage } from "ai";
import { chatNameFixture } from "@/chats/chat-name-fixtures.ts";
import { renameChat, saveMessage, saveReply } from "@/chats/store.ts";
import { messageIdFixture } from "@/id-fixtures.ts";
import type { ChatId, UserId } from "@/ids.ts";
import { manualUrl } from "@/manual/manual-source.ts";
import {
  mockWorkingNoteAnswer,
  mockWorkingNoteText,
} from "@/tutor/mock-working-note.ts";
import {
  CITE_MANUAL_TOOL,
  type CiteManualOutput,
} from "@/tutor/tools/cite-manual-contract.ts";
import {
  SEARCH_MANUAL_TOOL,
  type SearchManualOutput,
} from "@/tutor/tools/search-manual-contract.ts";
import {
  UPDATE_MEMORY_TOOL,
  type UpdateMemoryOutput,
} from "@/tutor/tools/update-memory-contract.ts";
import { chatMessages, lastMessage } from "../chat-page.ts";
import type { TestData } from "../fixtures.ts";
import { describeVisualPage } from "./visual-page.ts";

type ReplyPart = UIMessage["parts"][number];

// One of her messages and the tutor's reply to it, as the reply's stream
// saves them.
interface Exchange {
  readonly message: string;
  readonly reply: readonly ReplyPart[];
}

const TOPIC = "snorkelwump";
const CHAT_NAME = "Snorkelwump the den's roof";
const SNORKELWUMP_PAGE = "manual/modeling/meshes/editing/edge/snorkelwump.rst";
const BEVEL_PAGE = "manual/modeling/meshes/editing/edge/bevel.rst";

// What search_manual finds for the topic: two sections of one page.
const SEARCH_OUTPUT: SearchManualOutput = {
  sections: [
    {
      url: manualUrl(SNORKELWUMP_PAGE, "snorkelwump-edges"),
      label: "Snorkelwump Edges",
      excerpt: "Press Ctrl-Shift-W to snorkelwump the selected edges.",
    },
    {
      url: manualUrl(SNORKELWUMP_PAGE, "snorkelwump-depth"),
      label: "Snorkelwump Edges › Snorkelwump Depth",
      excerpt: "Drag the mouse to set how deep each snorkelwump goes.",
    },
  ],
};
const CITE_OUTPUT: CiteManualOutput = {
  citations: SEARCH_OUTPUT.sections.map(({ url, label }) => ({ url, label })),
};

const MEMORY_EDIT = { oldText: "", newText: "- [x] Bevel the roof's edges" };
const MEMORY_OUTPUT: UpdateMemoryOutput = {
  status: "updated",
  version: 1,
  ...MEMORY_EDIT,
};
// The tool input the mock sends, which update_memory's input schema refuses,
// so the tool fails.
const FAILING_MEMORY_INPUT = { oldText: 1 };
const MOCK_CALLED_UPDATE_MEMORY = `The mock tutor called \`${UPDATE_MEMORY_TOOL}\`.`;

const MARKDOWN_REPLY = [
  "## Beveling an edge",
  "",
  "A bevel *rounds* a hard edge.",
  "",
  "1. Select the edge.",
  "2. Press **Ctrl+B** and move the mouse.",
  "",
  "- Scroll to add segments.",
  "- Click to confirm.",
  "",
  "| Key | Action |",
  "| --- | --- |",
  "| Ctrl+B | Bevel |",
  "",
  `Read more in [the manual](${manualUrl(BEVEL_PAGE, "bevel")}).`,
  "",
  "```python",
  "import bpy",
  "bpy.ops.mesh.bevel(offset=0.1)",
  "```",
].join("\n");

function text(value: string): ReplyPart {
  return { type: "text", text: value, state: "done" };
}

const STEP: ReplyPart = { type: "step-start" };

const SEARCH: ReplyPart = {
  type: `tool-${SEARCH_MANUAL_TOOL}`,
  toolCallId: "mock-call-0-0",
  state: "output-available",
  input: { query: TOPIC },
  output: SEARCH_OUTPUT,
};

// Her messages, the mock tutor's commands, and its replies.
const EXCHANGES: readonly Exchange[] = [
  {
    message: `/mock-search ${TOPIC}`,
    reply: [
      STEP,
      SEARCH,
      STEP,
      {
        type: `tool-${CITE_MANUAL_TOOL}`,
        toolCallId: "mock-call-1-0",
        state: "output-available",
        input: { urls: SEARCH_OUTPUT.sections.map(({ url }) => url) },
        output: CITE_OUTPUT,
      },
      STEP,
      text(
        [
          `The manual covers "${TOPIC}":`,
          "",
          ...SEARCH_OUTPUT.sections.map(
            ({ label, excerpt }, index) =>
              `${index + 1}. **${label}**: ${excerpt}`,
          ),
        ].join("\n"),
      ),
    ],
  },
  {
    message: `/mock-working-note ${TOPIC}`,
    reply: [
      STEP,
      text(mockWorkingNoteText(TOPIC)),
      SEARCH,
      STEP,
      text(mockWorkingNoteAnswer(TOPIC)),
    ],
  },
  {
    message: `/mock-tool ${UPDATE_MEMORY_TOOL} ${JSON.stringify(MEMORY_EDIT)}`,
    reply: [
      STEP,
      {
        type: `tool-${UPDATE_MEMORY_TOOL}`,
        toolCallId: "mock-call-0-0",
        state: "output-available",
        input: MEMORY_EDIT,
        output: MEMORY_OUTPUT,
      },
      STEP,
      text(MOCK_CALLED_UPDATE_MEMORY),
    ],
  },
  {
    message: `/mock-tool ${UPDATE_MEMORY_TOOL} ${JSON.stringify(FAILING_MEMORY_INPUT)}`,
    reply: [
      STEP,
      {
        type: `tool-${UPDATE_MEMORY_TOOL}`,
        toolCallId: "mock-call-0-0",
        state: "output-error",
        input: FAILING_MEMORY_INPUT,
        errorText: "unknown",
      },
      STEP,
      text(MOCK_CALLED_UPDATE_MEMORY),
    ],
  },
  { message: "/mock-markdown", reply: [STEP, text(MARKDOWN_REPLY)] },
];

// The tokens the code highlighter coloured as keywords: their style names
// the theme's keyword colour.
const KEYWORD_COLOUR = "--code-keyword";
const CODE_KEYWORD = `span[style*="${KEYWORD_COLOUR}"]`;

// Her messages and a reply to each.
const MESSAGE_COUNT: number = EXCHANGES.length * 2;

// Saves the exchanges in the owner's chat, one after another, so they keep
// their order.
async function saveExchanges(
  owner: UserId,
  chatId: ChatId,
  exchanges: readonly Exchange[],
): Promise<void> {
  const [exchange, ...rest] = exchanges;
  if (exchange === undefined) {
    return;
  }
  const messageId = messageIdFixture();
  await saveMessage(owner, chatId, {
    id: messageId,
    role: "user",
    parts: [{ type: "text", text: exchange.message }],
  });
  await saveReply(
    owner,
    chatId,
    { id: messageIdFixture(), role: "assistant", parts: [...exchange.reply] },
    messageId,
  );
  await saveExchanges(owner, chatId, rest);
}

describeVisualPage({
  name: "chat",
  signedIn: true,
  open: async (page: Page, testData: TestData): Promise<void> => {
    const owner = testData.account.id;
    const chat = await testData.chat(
      await testData.project("Low-poly fox den"),
      "mr-tee",
    );
    // Named by hand, so the tutor's automatic names never change it.
    await renameChat(owner, chat.id, chatNameFixture(CHAT_NAME));
    await saveExchanges(owner, chat.id, EXCHANGES);
    await page.goto(`/chats/${chat.id}`);
    await expect(chatMessages(page)).toHaveCount(MESSAGE_COUNT);
    const code = lastMessage(page).getByRole("code");
    await expect(code).toContainText("import bpy");
    // Shiki colours the code after it shows, with no event to wait for, so
    // the shot waits for the keywords' colour rather than recording plain
    // code under load.
    await expect(code.locator(CODE_KEYWORD)).toHaveText(["import", "="]);
  },
});
