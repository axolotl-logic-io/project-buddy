import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ContinueForm } from "@/app/login/link/continue-form.tsx";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { LINK_PAGE_COPY } from "@/ui/copy/login.ts";

const actions = vi.hoisted(() => ({ continueSignInAction: vi.fn() }));
vi.mock("@/app/login/link/actions.ts", () => actions);

test("signup requires a name and keeps the typed name when the server refuses it", async () => {
  actions.continueSignInAction.mockResolvedValue({
    kind: "invalid",
    message: LINK_PAGE_COPY.nameInvalid,
  });
  await render(
    <ContinueForm token="verification" destination="/quests" signup={true} />,
  );
  const name = page.getByRole("textbox", {
    name: ACCOUNT_COPY.nameLabel,
    exact: true,
  });
  await expect.element(name).toBeRequired();
  await name.fill("{Mabel}");
  await page.getByRole("button", { name: LINK_PAGE_COPY.continue }).click();
  await expect.element(name).toHaveValue("{Mabel}");
  await expect.element(name).toBeInvalid();
  await expect
    .element(page.getByText(LINK_PAGE_COPY.nameInvalid))
    .toBeVisible();
  const form = actions.continueSignInAction.mock.lastCall?.[0];
  expect(form?.get("name")).toBe("{Mabel}");
  expect(form?.get("token")).toBe("verification");
  expect(form?.get("next")).toBe("/quests");
});

test("existing account sign-in offers Continue without asking for a name", async () => {
  await render(
    <ContinueForm token="login" destination={undefined} signup={false} />,
  );
  await expect.element(page.getByRole("textbox")).not.toBeInTheDocument();
  await expect
    .element(page.getByRole("button", { name: LINK_PAGE_COPY.continue }))
    .toBeEnabled();
});
