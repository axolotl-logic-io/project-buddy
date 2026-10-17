// The owner's central chat, which is in no project, for the tests of the
// tutor's prompt and reply in it. It has reply-test-kit.ts's chat id, so the
// kit's stores answer for it.
import { getBuddy, snapshotOf } from "@/buddies/index.ts";
import type { CentralChat } from "@/chats/chat-rows.ts";
import { CHAT_ID } from "@/tutor/reply-test-kit.ts";

const CENTRAL_CHAT: CentralChat = {
  kind: "central",
  id: CHAT_ID,
  buddy: snapshotOf(getBuddy("mr-tee")),
  name: undefined,
  renamedByHand: false,
  createdAt: new Date("2026-10-16T09:00:00Z"),
};

export { CENTRAL_CHAT };
