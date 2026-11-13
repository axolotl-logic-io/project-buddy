import type { QuestStatus } from "@/quests/quest-status.ts";

const STATUS_COMMANDS: Readonly<Record<string, QuestStatus>> = {
  "/complete": "completed",
  "/abandon": "abandoned",
  "/restore": "active",
};

function questStatusCommand(text: string): QuestStatus | undefined {
  const { [text.trim()]: status } = STATUS_COMMANDS;
  return status;
}

export { questStatusCommand };
