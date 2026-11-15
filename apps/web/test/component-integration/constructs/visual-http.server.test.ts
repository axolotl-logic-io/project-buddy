import sharp from "sharp";
import { expect, test, vi } from "vitest";
import { currentUser } from "@/auth/current-user.ts";
import { createConstruct } from "@/constructs/construct-store.ts";
import { deliverVisualAsset } from "@/constructs/visual-http.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { seedGeneratedArtwork } from "../../support/test-database/artwork-test-kit.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

vi.mock("@/auth/current-user.ts", () => ({ currentUser: vi.fn() }));

test("artwork delivery authenticates and validates requests before work", async () => {
  vi.mocked(currentUser).mockResolvedValue(undefined);
  expect(
    (
      await deliverVisualAsset(
        "construct",
        crypto.randomUUID(),
        crypto.randomUUID(),
      )
    ).status,
  ).toBe(HTTP_STATUS.unauthorized);
  vi.mocked(currentUser).mockResolvedValue(await testUser());
  expect((await deliverVisualAsset("construct", "bad", "bad")).status).toBe(
    HTTP_STATUS.notFound,
  );
});

test("artwork delivery is private, resized on request and revocable", async () => {
  const user = await testUser();
  const construct = await createConstruct(user.id, {
    name: "Owl",
    definition: {
      prompt: "Kind",
      visual: { version: 1, description: "A brass owl" },
    },
  });
  const id = await seedGeneratedArtwork(user.id, construct.id);
  vi.mocked(currentUser).mockResolvedValue(user);
  const response = await deliverVisualAsset("construct", construct.id, id);
  expect(response.status).toBe(HTTP_STATUS.ok);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  const resized = await deliverVisualAsset("construct", construct.id, id, "64");
  expect(resized.headers.get("cache-control")).toBe("private, no-store");
  expect(resized.headers.get("content-type")).toBe("image/webp");
  expect(
    await sharp(Buffer.from(await resized.arrayBuffer())).metadata(),
  ).toMatchObject({ width: 64, height: 64 });
  expect(
    (await deliverVisualAsset("construct", construct.id, id, "999999")).status,
  ).toBe(HTTP_STATUS.badRequest);
  vi.mocked(currentUser).mockResolvedValue(await testUser());
  expect(
    (await deliverVisualAsset("construct", construct.id, id, "64")).status,
  ).toBe(HTTP_STATUS.notFound);
});
