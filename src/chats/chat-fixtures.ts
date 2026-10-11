// Chat ids for tests, which cannot write a ChatId as a literal.
import { type ChatId, parseChatId } from "@/ids.ts";

// A new random chat id.
export function chatIdFixture(): ChatId {
  const id = parseChatId(crypto.randomUUID());
  if (id === undefined) {
    throw new Error("crypto.randomUUID returned a malformed UUID");
  }
  return id;
}
