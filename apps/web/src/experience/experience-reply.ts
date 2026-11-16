// The `exp` command (docs/local-constructs.md): the construct answers it in
// the conversation with the sender's experience, read as it replies: their
// circle and its title, the experience they still need for the next circle,
// and their points in each ability. It changes nothing, so it never saves the
// message to an active spell's Tasks or Ideas.

import { ABILITIES, type Experience } from "@/experience/experience.ts";
import { readExperience } from "@/experience/experience-store.ts";
import type { UserId } from "@/ids.ts";
import type { ChatRequest } from "@/replies/chat-protocol.ts";
import { EXPERIENCE_COPY } from "@/ui/copy/experience.ts";

// The command, in any case, with or without a leading "/".
const EXPERIENCE_COMMAND = /^\/?exp$/iu;

// Whether the text is the `exp` command.
function isExperienceCommand(text: string): boolean {
  return EXPERIENCE_COMMAND.test(text.trim());
}

// The reply's Markdown: the circle in bold, the standing, then a line for
// each ability.
function experienceText(experience: Experience): string {
  const { circle, title, points, nextCircleStart } = experience;
  return [
    `**${EXPERIENCE_COPY.circle(circle, title)}**`,
    "",
    EXPERIENCE_COPY.standing(
      experience.experience,
      nextCircleStart - experience.experience,
      circle + 1,
    ),
    "",
    ...ABILITIES.map(
      (ability) =>
        `- ${EXPERIENCE_COPY.abilities[ability]}: ${EXPERIENCE_COPY.points(points[ability])}`,
    ),
  ].join("\n");
}

// The construct's reply to the message if it is the `exp` command, with the
// sender's experience; undefined for any other message.
async function experienceReply(
  user: UserId,
  message: ChatRequest["message"],
): Promise<string | undefined> {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
  if (!isExperienceCommand(text)) {
    return undefined;
  }
  return experienceText(await readExperience(user));
}

export { experienceReply };
