import { beforeEach, describe, expect, test, vi } from "vitest";
import { SIGNED_IN_USER, signInAs } from "@/auth/current-user-test-kit.ts";
import { userPersonaIdFixture } from "@/id-fixtures.ts";
import { getPersona } from "@/personas/index.ts";
import type { listPersonas, UserPersona } from "@/personas/persona-store.ts";
import { ownPersonaChoices } from "./own-persona-choices.ts";

vi.mock(
  "@/auth/current-user.ts",
  () => import("@/auth/current-user-test-kit.ts"),
);

const store = vi.hoisted(() => ({
  listPersonas: vi.fn<typeof listPersonas>(),
}));
vi.mock("@/personas/persona-store.ts", () => store);

const OWN_PERSONA: UserPersona = {
  id: userPersonaIdFixture(),
  name: "Mr. Tee (copy)",
  parts: getPersona("mr-tee").parts,
  clonedFrom: "mr-tee",
  createdAt: new Date("2026-10-12T09:00:00Z"),
  updatedAt: new Date("2026-10-12T09:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(SIGNED_IN_USER);
  store.listPersonas.mockResolvedValue([OWN_PERSONA]);
});

describe("ownPersonaChoices", () => {
  test("lists her own personas by id and name alone, leaving their parts behind", async () => {
    expect(await ownPersonaChoices()).toEqual([
      { id: OWN_PERSONA.id, name: OWN_PERSONA.name },
    ]);
    expect(store.listPersonas).toHaveBeenCalledWith(SIGNED_IN_USER.id);
  });
});
