// Domain ids for tests, which cannot write a branded id as a literal. Each
// fixture makes a new random id, or the id that a given value names, and
// throws instead of returning undefined, so a test reads like the fixture it
// builds. Add a fixture for a new id type as one more `idFixture` line.
import {
  type ChatId,
  type MessageId,
  type ProjectId,
  parseChatId,
  parseMessageId,
  parseProjectId,
  parseUserId,
  parseUserPersonaId,
  type UserId,
  type UserPersonaId,
} from "@/ids.ts";

// Makes the id that value names, by default a new random UUID; throws,
// naming the fixture and the value, if it names none.
type IdFixture<Id> = (value?: string) => Id;

// The fixture called fixtureName that makes ids with parse.
function idFixture<Id>(
  fixtureName: string,
  parse: (value: string) => Id | undefined,
): IdFixture<Id> {
  return (value: string = crypto.randomUUID()): Id => {
    const id = parse(value);
    if (id === undefined) {
      throw new Error(`${fixtureName}: "${value}" is not a valid id`);
    }
    return id;
  };
}

const userIdFixture: IdFixture<UserId> = idFixture(
  "userIdFixture",
  parseUserId,
);
const projectIdFixture: IdFixture<ProjectId> = idFixture(
  "projectIdFixture",
  parseProjectId,
);
const chatIdFixture: IdFixture<ChatId> = idFixture(
  "chatIdFixture",
  parseChatId,
);
const messageIdFixture: IdFixture<MessageId> = idFixture(
  "messageIdFixture",
  parseMessageId,
);

const userPersonaIdFixture: IdFixture<UserPersonaId> = idFixture(
  "userPersonaIdFixture",
  parseUserPersonaId,
);

export {
  chatIdFixture,
  messageIdFixture,
  projectIdFixture,
  userIdFixture,
  userPersonaIdFixture,
};
