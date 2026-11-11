import { redirect } from "next/navigation";
import { STANDALONE_CHAT_PATH } from "@/routes.ts";

// The old new-adventure page's address, from links and bookmarks, opens
// Chat; quests start from the Quests page and activities from Activities.
// It makes nothing.
export default function OldNewChatPage(): never {
  redirect(STANDALONE_CHAT_PATH);
}
