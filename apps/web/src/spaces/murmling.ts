import { z } from "zod";
import { MURMLING_TYPE, SPACE_ID } from "./space.ts";

const MURMLING_ID = z.guid().toLowerCase().brand<"MurmlingId">();

const MURMLING_CHANGE = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("add"),
    text: z.string(),
    type: MURMLING_TYPE.optional(),
  }),
  z.object({ kind: z.literal("undo"), version: z.number().int().positive() }),
  z.object({
    kind: z.literal("recurring"),
    id: MURMLING_ID,
    recurring: z.boolean(),
  }),
  z.object({ kind: z.literal("edit"), id: MURMLING_ID, text: z.string() }),
  z.object({ kind: z.literal("type"), id: MURMLING_ID, type: MURMLING_TYPE }),
  z.object({
    kind: z.literal("check"),
    id: MURMLING_ID,
    checkedOff: z.boolean(),
  }),
  z.object({ kind: z.literal("remove"), id: MURMLING_ID }),
  z.object({ kind: z.literal("move"), id: MURMLING_ID, destination: SPACE_ID }),
  z.object({
    kind: z.literal("place"),
    id: MURMLING_ID,
    before: MURMLING_ID.optional(),
  }),
  z.object({
    kind: z.literal("reorder"),
    id: MURMLING_ID,
    direction: z.enum(["up", "down"]),
  }),
]);

type MurmlingChange = z.infer<typeof MURMLING_CHANGE>;

export type { MurmlingChange };
export { MURMLING_CHANGE, MURMLING_ID };
