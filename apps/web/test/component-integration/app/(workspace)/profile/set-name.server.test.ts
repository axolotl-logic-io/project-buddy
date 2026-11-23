import { expect, test, vi } from "vitest";
import { readUserName } from "@/accounts/users-store.ts";
import { setNameAction } from "@/app/(workspace)/profile/actions.ts";
import {
  CONJURATION,
  conjure,
  startPerformance,
} from "@/performances/performance-store.ts";
import { saveRite } from "@/rites/rite-store.ts";
import { listSpaces } from "@/spaces/space-store.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { testData } from "../../../../support/test-database/data-test-kit.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";

import { signIn } from "../../../test-database/session-test-kit.ts";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

test("use_case_set_name", async () => {
  const user = await testUser();
  const other = await testUser();
  const data = testData(user);
  const quest = await data.quest();
  const rite = await saveRite(user.id, {
    name: "Named replies",
    replies: ["Hi {user}"],
  });
  const [space] = await listSpaces(user.id, quest.id);
  if (rite === undefined || space === undefined) {
    throw new Error("The performance could not be prepared");
  }
  const performance = await startPerformance(user.id, quest.id, {
    spaceId: space.id,
    riteId: rite.id,
  });
  if (performance === undefined) {
    throw new Error("The performance could not start");
  }
  await signIn(user);
  const form = new FormData();
  form.set("name", "  Mabel ");
  form.set("userId", other.id);
  expect(await setNameAction({ kind: "idle" }, form)).toEqual({
    kind: "saved",
  });
  expect(await readUserName(user.id)).toBe("Mabel");
  expect(await readUserName(other.id)).toBeUndefined();
  expect(
    (
      await conjure(
        user.id,
        quest.id,
        CONJURATION.parse({
          id: crypto.randomUUID(),
          performanceId: performance.id,
          text: "An idea",
        }),
      )
    )?.reply,
  ).toBe("Hi Mabel");
  form.set("name", "{x}");
  expect(await setNameAction({ kind: "idle" }, form)).toEqual({
    kind: "invalid",
    message: ACCOUNT_COPY.nameBraces,
  });
  expect(await readUserName(user.id)).toBe("Mabel");
  form.set("name", "");
  expect(await setNameAction({ kind: "idle" }, form)).toEqual({
    kind: "invalid",
    message: ACCOUNT_COPY.nameRequired,
  });
  expect(
    (
      await conjure(
        user.id,
        quest.id,
        CONJURATION.parse({
          id: crypto.randomUUID(),
          performanceId: performance.id,
          text: "Another idea",
        }),
      )
    )?.reply,
  ).toBe("Hi Mabel");
});
