import { z } from "zod";
import { CADENCES } from "@/streaks/streaks.ts";
import { LIST_ID } from "./list.ts";

const LIST_ITEM_ID = z.guid().toLowerCase().brand<"ListItemId">();
type ListItemId = z.infer<typeof LIST_ITEM_ID>;

const LIST_ITEM_CHANGE = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("add"), text: z.string() }),
  z.object({ kind: z.literal("undo"), version: z.number().int().positive() }),
  // A task made recurring with a cadence, or one-off with none.
  z.object({
    kind: z.literal("recurring"),
    id: LIST_ITEM_ID,
    cadence: z.enum(CADENCES).nullable(),
  }),
  z.object({ kind: z.literal("edit"), id: LIST_ITEM_ID, text: z.string() }),
  z.object({
    kind: z.literal("check"),
    id: LIST_ITEM_ID,
    checkedOff: z.boolean(),
  }),
  z.object({ kind: z.literal("remove"), id: LIST_ITEM_ID }),
  z.object({ kind: z.literal("move"), id: LIST_ITEM_ID, destination: LIST_ID }),
  z.object({
    kind: z.literal("place"),
    id: LIST_ITEM_ID,
    before: LIST_ITEM_ID.optional(),
  }),
  z.object({
    kind: z.literal("reorder"),
    id: LIST_ITEM_ID,
    direction: z.enum(["up", "down"]),
  }),
]);

type ListItemChange = z.infer<typeof LIST_ITEM_CHANGE>;

export type { ListItemChange, ListItemId };
export { LIST_ITEM_CHANGE, LIST_ITEM_ID };
