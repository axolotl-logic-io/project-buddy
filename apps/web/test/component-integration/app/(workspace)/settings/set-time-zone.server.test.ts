// "use_case_set_time_zone" in use-cases/accounts.md, against the test
// database: Settings saves the signed-in user's time zone, and refuses a
// name the site doesn't know.

import { describe, expect, test } from "vitest";
import { findUserByEmail } from "@/accounts/users-store.ts";
import { setTimeZoneAction } from "@/app/(stream)/(site)/(workspace)/settings/actions.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { testUser } from "../../../../support/test-database/user-test-kit.ts";
import { formOf } from "../../../test-database/form-test-kit.ts";
import { signIn } from "../../../test-database/session-test-kit.ts";

describe("use_case_set_time_zone", () => {
  test("saves the signed-in user's time zone, and no one else's", async () => {
    const [user, other] = [await testUser(), await testUser()];
    await signIn(user);

    expect(
      await setTimeZoneAction(
        { kind: "idle" },
        formOf({ timeZone: "America/Chicago", userId: other.id }),
      ),
    ).toEqual({ kind: "saved" });
    expect((await findUserByEmail(user.email))?.timeZone).toBe(
      "America/Chicago",
    );
    expect((await findUserByEmail(other.email))?.timeZone).toBe("UTC");
  });

  test.each(["Mars/Olympus_Mons", "", "UTC; drop table users"])(
    "refuses the unknown time zone %j and keeps the saved one",
    async (timeZone) => {
      const user = await testUser();
      await signIn(user);

      expect(
        await setTimeZoneAction({ kind: "idle" }, formOf({ timeZone })),
      ).toEqual({ kind: "invalid", message: ACCOUNT_COPY.timeZoneUnknown });
      expect((await findUserByEmail(user.email))?.timeZone).toBe("UTC");
    },
  );
});
