// The audit uses the same account/data/session kits as server and auth tests.
import { createSessionToken } from "../../src/auth/session-token.ts";
import { readSessionSecret } from "../../src/env.ts";
import {
  type Exchange,
  testData,
} from "../../test/support/test-database/data-test-kit.ts";
import { testUser } from "../../test/support/test-database/user-test-kit.ts";
import { checkTestEnvironment } from "../test-db/test-database.ts";

const PARAGRAPH_REPEATS = 20;

async function seedAudit(): Promise<{
  empty: string;
  populated: string;
  details: string;
  project: string;
  chat: string;
  construct: string;
  emptyProject: string;
  emptyChat: string;
}> {
  checkTestEnvironment();
  const empty = await testUser();
  const populated = await testUser();
  const kit = testData(populated);
  const project = await kit.project("Synthetic audit quest");
  const chat = await kit.chat(project);
  await kit.exchanges(
    chat,
    Array.from(
      { length: 100 },
      (_, index): Exchange => ({
        message: `Synthetic question ${index}.`,
        reply: [
          {
            type: "text",
            text:
              `Synthetic answer ${index}. ` +
              "A synthetic paragraph for repeatable rendering. ".repeat(
                PARAGRAPH_REPEATS,
              ),
          },
        ],
      }),
    ),
  );
  const construct = await kit.editedConstruct();
  const details = await testUser();
  const detailKit = testData(details);
  const emptyProject = await detailKit.project("Synthetic empty quest");
  const emptyChat = await detailKit.chat(emptyProject);
  const secret = readSessionSecret();
  return {
    empty: await createSessionToken(empty, secret, new Date()),
    populated: await createSessionToken(populated, secret, new Date()),
    details: await createSessionToken(details, secret, new Date()),
    project: project.id,
    chat: chat.id,
    construct: construct.id,
    emptyProject: emptyProject.id,
    emptyChat: emptyChat.id,
  };
}

export { seedAudit };
