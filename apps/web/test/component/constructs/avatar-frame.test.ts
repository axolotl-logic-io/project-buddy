import type { LanguageModelV4GenerateResult } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import sharp from "sharp";
import { expect, test } from "vitest";
import {
  frameAroundHead,
  MAX_FRAMING_COST_MICRO_USD,
  modelAvatarFramer,
} from "@/constructs/avatar-frame.ts";
import { callCost } from "@/quota/prices.ts";

const INPUT_TOKENS = 700;
const OUTPUT_TOKENS = 40;

// A model that answers every framing question with answer, at the usage
// above.
function answering(answer: string): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: async (): Promise<LanguageModelV4GenerateResult> => ({
      content: [{ type: "text", text: answer }],
      finishReason: { unified: "stop", raw: "end_turn" },
      usage: {
        inputTokens: {
          total: INPUT_TOKENS,
          noCache: INPUT_TOKENS,
          cacheRead: 0,
          cacheWrite: 0,
        },
        outputTokens: {
          total: OUTPUT_TOKENS,
          text: OUTPUT_TOKENS,
          reasoning: undefined,
        },
      },
      warnings: [],
    }),
  });
}

async function squareImage(): Promise<Uint8Array> {
  return new Uint8Array(
    await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#808080" },
    })
      .webp()
      .toBuffer(),
  );
}

// A frame's centre and size, which frameAroundHead's are compared with.
const FRAME_KEYS = ["x", "y", "size"] as const;

test.each([
  {
    name: "holds the whole head, face included, with a margin, centred on it",
    boxes: {
      face: { left: 0.4, top: 0.2, width: 0.1, height: 0.1 },
      head: { left: 0.35, top: 0.1, width: 0.2, height: 0.25 },
    },
    frame: { x: 0.45, y: 0.225, size: 0.3 },
  },
  {
    name: "widens to hold a face outside the head box",
    boxes: {
      face: { left: 0.4, top: 0.4, width: 0.2, height: 0.2 },
      head: { left: 0.4, top: 0.1, width: 0.2, height: 0.2 },
    },
    frame: { x: 0.5, y: 0.35, size: 0.6 },
  },
  {
    name: "stays inside the image for a head near its edge",
    boxes: {
      face: { left: 0, top: 0, width: 0.1, height: 0.1 },
      head: { left: 0, top: 0, width: 0.3, height: 0.2 },
    },
    frame: { x: 0.18, y: 0.18, size: 0.36 },
  },
  {
    name: "is never closer than a fifth of the image for a tiny head",
    boxes: {
      face: { left: 0.5, top: 0.5, width: 0.01, height: 0.01 },
      head: { left: 0.5, top: 0.5, width: 0.02, height: 0.02 },
    },
    frame: { x: 0.51, y: 0.51, size: 0.2 },
  },
])("the avatar frame $name", ({ boxes, frame }) => {
  const framed = frameAroundHead(boxes);
  for (const key of FRAME_KEYS) {
    expect(framed?.[key]).toBeCloseTo(frame[key]);
  }
});

test.each([
  { name: "empty", head: { left: 0.2, top: 0.2, width: 0, height: 0.3 } },
  {
    name: "outside the image",
    head: { left: 1.2, top: 0.2, width: 0.3, height: 0.3 },
  },
  {
    name: "not a number",
    head: { left: Number.NaN, top: 0.2, width: 0.3, height: 0.3 },
  },
])("a head box that is $name frames nothing", ({ head }) => {
  const face = { left: 0.4, top: 0.4, width: 0.1, height: 0.1 };
  expect(frameAroundHead({ face, head })).toBeUndefined();
});

test("the model's head box becomes the frame, charged at the framing model's prices", async () => {
  const boxes = {
    face: { left: 0.4, top: 0.2, width: 0.1, height: 0.1 },
    head: { left: 0.35, top: 0.1, width: 0.2, height: 0.25 },
  };
  const framer = modelAvatarFramer(answering(JSON.stringify(boxes)));
  const framing = await framer.frame(await squareImage());
  expect(framing.frame).toEqual(frameAroundHead(boxes));
  expect(framing.costMicroUsd).toBe(
    callCost("claude-haiku-5-5", {
      input: INPUT_TOKENS,
      cacheRead: 0,
      cacheWrite5m: 0,
      cacheWrite1h: 0,
      output: OUTPUT_TOKENS,
    }),
  );
});

test("an answer that isn't two boxes frames nothing and is charged no more than a framing call can cost", async () => {
  const framer = modelAvatarFramer(answering("I see a fox."));
  const framing = await framer.frame(await squareImage());
  expect(framing.frame).toBeUndefined();
  expect(framing.costMicroUsd).toBeGreaterThan(0);
  expect(framing.costMicroUsd).toBeLessThanOrEqual(MAX_FRAMING_COST_MICRO_USD);
});

test("a failed framing call frames nothing and is charged as the most it could cost", async () => {
  const framer = modelAvatarFramer(
    new MockLanguageModelV4({
      doGenerate: (): Promise<never> =>
        Promise.reject(new Error("Provider unavailable")),
    }),
  );
  const framing = await framer.frame(await squareImage());
  expect(framing).toEqual({
    frame: undefined,
    costMicroUsd: MAX_FRAMING_COST_MICRO_USD,
  });
});
