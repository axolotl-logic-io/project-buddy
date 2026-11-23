import { z } from "zod";
import { QUEST_ID } from "@/ids.ts";
import { MURMLING_ID } from "./murmling.ts";
import { MURMLING_TYPE, SPACE_ID } from "./space.ts";

const MURMLING_RECORD = z.object({
  id: MURMLING_ID,
  questId: QUEST_ID,
  spaceId: SPACE_ID,
  position: z.number().int(),
  text: z.string(),
  type: MURMLING_TYPE,
  taskNumber: z.number().int().positive().nullable(),
  checkedOff: z.boolean(),
  recurring: z.boolean(),
  createdAt: z.union([
    z.date(),
    z.iso.datetime().transform((value) => new Date(value)),
  ]),
});

export { MURMLING_RECORD };
