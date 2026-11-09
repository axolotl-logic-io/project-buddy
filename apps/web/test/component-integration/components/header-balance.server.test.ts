import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { SignedInLinks } from "@/components/site-header.tsx";
import { transferGold } from "@/gold/gold-store.ts";
import { spendGold } from "../../support/test-database/gold-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";
import { signIn } from "../test-database/session-test-kit.ts";

const FRACTIONAL_SPEND = 10_001;
const TRANSFER = 5;

describe("use_case_see_gold", () => {
  test("header reads the viewer's own balance beside a quest place and reflects charges and transfers", async () => {
    const [viewer, other] = await Promise.all([testUser(), testUser()]);
    await signIn(viewer);
    expect(
      renderToStaticMarkup(await SignedInLinks({ place: "Team quest" })),
    ).toContain("<span>100</span>");
    await spendGold(other, FRACTIONAL_SPEND);
    expect(
      renderToStaticMarkup(await SignedInLinks({ place: "Team quest" })),
    ).toContain("<span>100</span>");
    await spendGold(viewer, FRACTIONAL_SPEND);
    expect(renderToStaticMarkup(await SignedInLinks())).toContain(
      "<span>98</span>",
    );
    await transferGold(viewer.id, {
      payee: other.id,
      gold: TRANSFER,
      reason: "marketplace-sale",
      referenceId: crypto.randomUUID(),
    });
    expect(renderToStaticMarkup(await SignedInLinks())).toContain(
      "<span>93</span>",
    );
  });
});
