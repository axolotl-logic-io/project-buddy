import { expect, test, vi } from "vitest";
import { getConstruct } from "@/constructs/index.ts";
import { ownConstructChoices } from "@/constructs/own-construct-choices.ts";
import { userConstructIdFixture } from "../../support/id-fixtures.ts";

const dependencies = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listConstructs: vi.fn(),
}));
vi.mock("@/auth/current-user.ts", () => ({
  requireUser: dependencies.requireUser,
}));
vi.mock("@/constructs/construct-store.ts", () => ({
  listConstructs: dependencies.listConstructs,
}));

test("creation choices retain saved artwork without sending private conversational instructions", async () => {
  const id = userConstructIdFixture();
  const { visual } = getConstruct("vellum").definition;
  dependencies.requireUser.mockResolvedValue({ id: "acting user" });
  dependencies.listConstructs.mockResolvedValue([
    {
      id,
      name: "Saved mapmaker",
      definition: { prompt: "Private instructions", visual },
    },
  ]);
  const choices = await ownConstructChoices();
  expect(choices).toEqual([{ id, name: "Saved mapmaker", visual }]);
  expect(dependencies.listConstructs).toHaveBeenCalledWith("acting user");
  expect(JSON.stringify(choices)).not.toContain("Private instructions");
});
