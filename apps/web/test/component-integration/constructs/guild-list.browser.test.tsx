import { expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import GuildPage from "@/app/(workspace)/guild/(list)/page.tsx";
import { newConstructAction } from "@/app/(workspace)/guild/actions.ts";
import {
  listConstructs,
  type OwnConstruct,
} from "@/constructs/construct-store.ts";
import { GUILD_COPY } from "@/ui/copy/guild.ts";
import { userConstructIdFixture } from "../../support/id-fixtures.ts";
import { HIPPY_CLONE } from "../app/phone-pages-fixtures.ts";
import { inWorkspace } from "../app/workspace-test-kit.tsx";
import { SIGNED_IN_USER, signInAs } from "../auth/current-user-test-kit.ts";
import { tabForward } from "../components/keyboard-test-kit.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("../auth/current-user-test-kit.ts"),
);
vi.mock("@/constructs/construct-store.ts", () => ({
  listConstructs: vi.fn<typeof listConstructs>(),
}));
// Listing exposes these actions; only New construct is submitted, from the
// keyboard.
vi.mock("@/app/(workspace)/guild/actions.ts", () => ({
  cloneConstructAction: vi.fn(),
  editBuiltInConstructAction: vi.fn(),
  newConstructAction: vi.fn(),
}));

const BUILT_INS = [
  { id: "hippy", name: "Hippy" },
  { id: "mr-tee", name: "Mr. Tee" },
  { id: "fjord-tines", name: "Fjord Tines" },
  { id: "span-tines", name: "Span Tines" },
  { id: "argon-sprangler", name: "Argon Sprangler" },
  { id: "roland-dustchain", name: "Roland Dustchain" },
];
// The store supplies oldest first; the page must retain that order, not
// sort by name. Database ownership and ordering remain server-test concerns.
const OWN_CONSTRUCTS: OwnConstruct[] = [
  { ...HIPPY_CLONE, name: "Zebra guide" },
  {
    ...HIPPY_CLONE,
    id: userConstructIdFixture("3d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a"),
    name: "Alpine guide",
    createdAt: new Date("2026-10-13T09:00:00Z"),
  },
];

test("use_case_view_guild", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listConstructs).mockResolvedValue(OWN_CONSTRUCTS);
  const screen = await render(
    inWorkspace(
      await GuildPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  const builtIn = page.getByRole("region", {
    name: GUILD_COPY.builtInHeading,
  });
  const own = page.getByRole("region", { name: GUILD_COPY.ownHeading });

  await expect
    .element(
      page.getByRole("heading", {
        level: 1,
        name: GUILD_COPY.heading,
      }),
    )
    .toBeVisible();
  await expect.element(page.getByText(GUILD_COPY.intro)).toBeVisible();
  expect(page.getByRole("region").elements()).toEqual([
    builtIn.element(),
    own.element(),
  ]);
  expect(builtIn.getByRole("listitem").elements()).toHaveLength(
    BUILT_INS.length,
  );
  await Promise.all(
    BUILT_INS.map(async (construct) => {
      await expect
        .element(
          builtIn.getByRole("link", {
            name: construct.name,
            exact: true,
          }),
        )
        .toHaveAttribute("href", `/guild/${construct.id}`);
      await expect
        .element(
          builtIn.getByRole("button", {
            name: GUILD_COPY.customizeLabel(construct.name),
            exact: true,
          }),
        )
        .toBeEnabled();
    }),
  );
  expect(own.getByRole("listitem").elements()).toHaveLength(
    OWN_CONSTRUCTS.length,
  );
  expect(
    own
      .getByRole("link")
      .elements()
      .map((link) => link.textContent),
  ).toEqual([
    OWN_CONSTRUCTS[0]?.name,
    GUILD_COPY.tweak,
    OWN_CONSTRUCTS[1]?.name,
    GUILD_COPY.tweak,
  ]);
  await Promise.all(
    OWN_CONSTRUCTS.map(async (construct) => {
      await expect
        .element(
          own.getByRole("link", {
            name: construct.name,
            exact: true,
          }),
        )
        .toHaveAttribute("href", `/guild/${construct.id}`);
      await expect
        .element(
          own.getByRole("link", {
            name: GUILD_COPY.tweakLabel(construct.name),
            exact: true,
          }),
        )
        .toHaveAttribute("href", `/guild/${construct.id}`);
      await expect
        .element(
          own.getByRole("button", {
            name: GUILD_COPY.cloneLabel(construct.name),
            exact: true,
          }),
        )
        .toBeEnabled();
    }),
  );
  await expect.element(own.getByText(GUILD_COPY.noOwn)).not.toBeInTheDocument();
  await expect
    .element(own.getByRole("button", { name: GUILD_COPY.newConstruct }))
    .toBeEnabled();

  vi.mocked(listConstructs).mockResolvedValue([]);
  await screen.rerender(
    inWorkspace(
      await GuildPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  await expect.element(own.getByText(GUILD_COPY.noOwn)).toBeVisible();
  await expect
    .element(own.getByRole("button", { name: GUILD_COPY.newConstruct }))
    .toBeEnabled();
  expect(own.getByRole("listitem").elements()).toEqual([]);
  expect(builtIn.getByRole("listitem").elements()).toHaveLength(
    BUILT_INS.length,
  );
});

test("New construct is the next control after the built-in constructs, and Enter writes one", async () => {
  signInAs(SIGNED_IN_USER);
  vi.mocked(listConstructs).mockResolvedValue([]);
  const submitted = Promise.withResolvers<void>();
  // The action redirects; here it only says it was submitted.
  vi.mocked(newConstructAction).mockImplementation(() => {
    submitted.resolve();
    return new Promise<never>(() => undefined);
  });
  await render(
    inWorkspace(
      await GuildPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({}),
      }),
    ),
  );
  const lastBuiltIn = BUILT_INS.at(-1)?.name ?? "";

  page
    .getByRole("button", { name: GUILD_COPY.customizeLabel(lastBuiltIn) })
    .element()
    .focus();
  await tabForward();
  await expect
    .element(page.getByRole("button", { name: GUILD_COPY.newConstruct }))
    .toHaveFocus();
  await userEvent.keyboard("{Enter}");

  await submitted.promise;
  expect(newConstructAction).toHaveBeenCalledOnce();
});
