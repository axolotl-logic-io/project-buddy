// Chooses generated construct artwork's avatar frame from the image itself:
// the box a vision model draws around the character's head, or around the
// main subject when there is no face, widened to keep the whole head and a
// margin, and kept inside the image. The one canonical image's other roles
// keep the whole image (docs/construct-visuals.md). Built-in artwork carries
// hand-chosen frames and never comes here.
//
// The model sees only the generated picture, scaled down, and a fixed
// question: no name, description or prompt. Its cost joins the image's in
// the generation's battery reservation (visual-generation.ts).

import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, type LanguageModel, Output } from "ai";
import sharp from "sharp";
import { z } from "zod";
import type { VisualFrame } from "@/constructs/visual.ts";
import { readAnthropicApiKeyIfSet, readConstructModel } from "@/env.ts";
import { callCost } from "@/quota/prices.ts";

const FRAMING_MODEL_ID = "claude-haiku-5-5";
const FRAMING_TIMEOUT_MS = 30_000;
const MAX_FRAMING_TOKENS = 100;
// The image is sent at this width, enough to find a head in.
const FRAMING_IMAGE_PX = 512;
// What a framing call can cost at most: the scaled image and the question
// (about 700 tokens) and the answer, with room to spare. A call that fails
// after it may have been billed is charged this.
const MAX_FRAMING_COST_MICRO_USD = callCost(FRAMING_MODEL_ID, {
  input: 1500,
  cacheRead: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  output: MAX_FRAMING_TOKENS,
});
// The frame is this much wider than the head, for a little air around it.
const HEAD_MARGIN = 1.2;
// A frame never zooms closer than this, however small the head.
const MIN_FRAME_SIZE = 0.2;

const FRAMING_QUESTION =
  "This picture is a character illustration, which may include labels, notes or small sketches around the character. Find the main character and give two boxes, each as fractions of the picture's width and height measured from its top-left corner (left, top, width and height, each between 0 and 1). face: the box around the character's face: its eyes, and its nose, beak or mouth. head: the box around the character's whole head, including anything that rises from or sits on it, such as hair, ears, horns, a hat, leaves or a sprout; for a character whose body is its head, the whole body. If the character has no face, give its most recognizable part as both boxes. Ignore labels, text and small sketches.";

// A box as the model gives it, before it is checked.
const BOX = z.object({
  left: z.number(),
  top: z.number(),
  width: z.number(),
  height: z.number(),
});
// The model's answer: where the character's face and whole head are.
const HEAD_BOXES = z.object({ face: BOX, head: BOX });
type HeadBoxes = z.infer<typeof HEAD_BOXES>;

// A box's edges, inside the image.
interface Edges {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

// The frame an image gets when no head box is known: its centre, half its
// width, as generated artwork was framed before.
const CENTRE_AVATAR_FRAME: VisualFrame = { x: 0.5, y: 0.5, size: 0.5 };

interface AvatarFraming {
  // Undefined when the image's head couldn't be found.
  readonly frame: VisualFrame | undefined;
  // What the call cost, in micro-USD, whether or not it found a head.
  readonly costMicroUsd: number;
}

interface AvatarFramer {
  readonly frame: (bytes: Uint8Array) => Promise<AvatarFraming>;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

// The part of box inside the image, or undefined for one that isn't a box:
// not finite, empty, or wholly outside the image.
function edgesOf(box: z.infer<typeof BOX>): Edges | undefined {
  const values = [box.left, box.top, box.width, box.height];
  if (!values.every(Number.isFinite) || box.width <= 0 || box.height <= 0) {
    return undefined;
  }
  const edges = {
    left: clamp(box.left, 0, 1),
    top: clamp(box.top, 0, 1),
    right: clamp(box.left + box.width, 0, 1),
    bottom: clamp(box.top + box.height, 0, 1),
  };
  if (edges.right <= edges.left || edges.bottom <= edges.top) {
    return undefined;
  }
  return edges;
}

// The avatar frame for a character: centred on its whole head, face
// included, HEAD_MARGIN times the head's larger side, and inside the image.
// Undefined without a head.
function frameAroundHead(boxes: HeadBoxes): VisualFrame | undefined {
  const head = edgesOf(boxes.head);
  if (head === undefined) {
    return undefined;
  }
  const face = edgesOf(boxes.face) ?? head;
  const left = Math.min(head.left, face.left);
  const top = Math.min(head.top, face.top);
  const right = Math.max(head.right, face.right);
  const bottom = Math.max(head.bottom, face.bottom);
  const size = clamp(
    Math.max(right - left, bottom - top) * HEAD_MARGIN,
    MIN_FRAME_SIZE,
    1,
  );
  const half = size / 2;
  return {
    x: clamp((left + right) / 2, half, 1 - half),
    y: clamp((top + bottom) / 2, half, 1 - half),
    size,
  };
}

// A framer asking model, priced as FRAMING_MODEL_ID. It never throws: a
// failed call finds no head and is charged as the most it could have cost.
function modelAvatarFramer(model: LanguageModel): AvatarFramer {
  return {
    async frame(bytes: Uint8Array): Promise<AvatarFraming> {
      try {
        const image = await sharp(bytes)
          .resize(FRAMING_IMAGE_PX, FRAMING_IMAGE_PX, { fit: "inside" })
          .webp()
          .toBuffer();
        const result = await generateText({
          model,
          output: Output.object({ schema: HEAD_BOXES }),
          messages: [
            {
              role: "user",
              content: [
                { type: "file", data: image, mediaType: "image/webp" },
                { type: "text", text: FRAMING_QUESTION },
              ],
            },
          ],
          maxOutputTokens: MAX_FRAMING_TOKENS,
          // The box is a short answer; thinking would spend the tokens first.
          providerOptions: { anthropic: { thinking: { type: "disabled" } } },
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(FRAMING_TIMEOUT_MS),
        });
        let costMicroUsd = MAX_FRAMING_COST_MICRO_USD;
        const { inputTokens, outputTokens } = result.usage;
        if (inputTokens !== undefined && outputTokens !== undefined) {
          costMicroUsd = callCost(FRAMING_MODEL_ID, {
            input: inputTokens,
            cacheRead: 0,
            cacheWrite5m: 0,
            cacheWrite1h: 0,
            output: outputTokens,
          });
        }
        return { frame: frameAroundHead(result.output), costMicroUsd };
      } catch {
        return { frame: undefined, costMicroUsd: MAX_FRAMING_COST_MICRO_USD };
      }
    },
  };
}

// Undefined under the mock model or without Claude's credential: generated
// artwork then keeps the centre frame, and nothing is charged for framing.
function avatarFramer(): AvatarFramer | undefined {
  if (readConstructModel() === "mock") {
    return undefined;
  }
  const apiKey = readAnthropicApiKeyIfSet();
  if (apiKey === undefined) {
    return undefined;
  }
  return modelAvatarFramer(createAnthropic({ apiKey })(FRAMING_MODEL_ID));
}

export type { AvatarFramer, AvatarFraming };
export {
  avatarFramer,
  CENTRE_AVATAR_FRAME,
  frameAroundHead,
  MAX_FRAMING_COST_MICRO_USD,
  modelAvatarFramer,
};
