import sharp from "sharp";
import { expect, test, vi } from "vitest";
import { currentUser } from "@/auth/current-user.ts";
import { createConstruct } from "@/constructs/construct-store.ts";
import { generateConstructVisual } from "@/constructs/visual-generation.ts";
import {
  VISUAL_GENERATION_QUOTE,
  VISUAL_GENERATION_RESULT,
} from "@/constructs/visual-generation-contract.ts";
import {
  deliverVisualAsset,
  getVisualGeneration,
  postVisualGeneration,
} from "@/constructs/visual-http.ts";
import { HTTP_STATUS } from "@/http-status.ts";
import { testUser } from "../../support/test-database/user-test-kit.ts";

vi.mock("@/auth/current-user.ts", () => ({ currentUser: vi.fn() }));
const GENERATE_URL = "http://localhost/api/constructs/visuals/generate";
function post(body: unknown): Request {
  return new Request(GENERATE_URL, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
test("generation HTTP boundaries authenticate and validate requests before work", async () => {
  vi.mocked(currentUser).mockResolvedValue(undefined);
  expect((await postVisualGeneration(post({}))).status).toBe(
    HTTP_STATUS.unauthorized,
  );
  expect((await getVisualGeneration(new Request(GENERATE_URL))).status).toBe(
    HTTP_STATUS.unauthorized,
  );
  expect(
    (
      await deliverVisualAsset(
        "construct",
        crypto.randomUUID(),
        crypto.randomUUID(),
      )
    ).status,
  ).toBe(HTTP_STATUS.unauthorized);
  const user = await testUser();
  vi.mocked(currentUser).mockResolvedValue(user);
  expect((await postVisualGeneration(post({}))).status).toBe(
    HTTP_STATUS.badRequest,
  );
  expect((await getVisualGeneration(new Request(GENERATE_URL))).status).toBe(
    HTTP_STATUS.badRequest,
  );
  expect(
    (
      await getVisualGeneration(
        new Request(`${GENERATE_URL}?constructId=${crypto.randomUUID()}`),
      )
    ).status,
  ).toBe(HTTP_STATUS.notFound);
  expect((await deliverVisualAsset("construct", "bad", "bad")).status).toBe(
    HTTP_STATUS.notFound,
  );
});
test("quote/status is read only and generated delivery is private with revocable authorization", async () => {
  const user = await testUser();
  const construct = await createConstruct(user.id, {
    name: "Owl",
    definition: {
      prompt: "Kind",
      visual: { version: 1, description: "A brass owl" },
    },
  });
  vi.mocked(currentUser).mockResolvedValue(user);
  const quoteResponse = await getVisualGeneration(
    new Request(`${GENERATE_URL}?constructId=${construct.id}`),
  );
  expect(quoteResponse.status).toBe(HTTP_STATUS.ok);
  expect(
    VISUAL_GENERATION_QUOTE.parse(await quoteResponse.json()),
  ).toMatchObject({ reservationGold: 25, available: false, outdated: false });
  const missingRequest = await getVisualGeneration(
    new Request(
      `${GENERATE_URL}?constructId=${construct.id}&requestId=${crypto.randomUUID()}`,
    ),
  );
  expect(missingRequest.status).toBe(HTTP_STATUS.ok);
  expect(
    VISUAL_GENERATION_QUOTE.parse(await missingRequest.json()).result?.status,
  ).toBe("not-found");
  const request = {
    constructId: construct.id,
    requestId: crypto.randomUUID(),
    description: "A brass owl",
  };
  expect(
    VISUAL_GENERATION_RESULT.parse(
      await (await postVisualGeneration(post(request))).json(),
    ).status,
  ).toBe("unavailable");
  const result = await generateConstructVisual(user.id, request, {
    generate: async () => ({
      bytes: await sharp({
        create: { width: 32, height: 32, channels: 3, background: "white" },
      })
        .png()
        .toBuffer(),
      mediaType: "image/png",
      costMicroUsd: 0,
    }),
  });
  if (result.visual?.canonical?.kind !== "generated") {
    throw new Error("No generated image");
  }
  const id = result.visual.canonical.assetId;
  const response = await deliverVisualAsset("construct", construct.id, id);
  expect(response.status).toBe(HTTP_STATUS.ok);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-type")).toBe("image/webp");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  vi.mocked(currentUser).mockResolvedValue(await testUser());
  expect((await deliverVisualAsset("construct", construct.id, id)).status).toBe(
    HTTP_STATUS.notFound,
  );
});
