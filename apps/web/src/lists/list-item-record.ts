import { z } from "zod";
import { QUEST_ID } from "@/ids.ts";
import { LIST_ID } from "./list.ts";
import { LIST_ITEM_ID } from "./list-item.ts";

const LIST_ITEM_RECORD = z.object({
  id: LIST_ITEM_ID,
  questId: QUEST_ID,
  listId: LIST_ID,
  position: z.number().int(),
  text: z.string(),
  taskNumber: z.number().int().positive().nullable(),
  checkedOff: z.boolean(),
  recurring: z.boolean(),
  createdAt: z.union([
    z.date(),
    z.iso.datetime().transform((value) => new Date(value)),
  ]),
});

export { LIST_ITEM_RECORD };
