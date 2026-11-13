import { redirect } from "next/navigation";
import { STANDALONE_CHAT_PATH } from "@/routes.ts";

export default function OldNewChatPage(): never {
  redirect(STANDALONE_CHAT_PATH);
}
