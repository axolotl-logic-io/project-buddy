// The adventure's background read of the viewer's batteries and reply costs.
// An open adventure runs it whenever its messages change, including when she
// sends one, so a signed-out answer must leave the page where it is: the
// adventure's own signed-out message (use_case_session_expired_in_chat) is
// what tells her, not a sudden move to the sign-in page.
import { describe, expect, test } from "vitest";
import { replyGoldAction } from "@/replies/reply-gold-action.ts";
import { signedInChat } from "../test-database/chat-test-kit.ts";
import { lapsed } from "../test-database/session-test-kit.ts";

describe("reply gold for an open adventure", () => {
  test("is the viewer's while she is signed in", async () => {
    const { user, chat } = await signedInChat();

    expect((await replyGoldAction(chat.id, []))?.viewer).toBe(user.id);
  });

  test("is nothing once her sign-in lapses, and doesn't send her to sign in", async () => {
    const { user, chat } = await signedInChat();
    await lapsed(user);

    await expect(replyGoldAction(chat.id, [])).resolves.toBeUndefined();
  });
});
