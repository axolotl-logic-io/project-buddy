// The words and shapes of Zotero Collection lists that the store, the sync,
// the actions and the pages share: a reference's Works Cited entry, a
// checkmark tag, why a collection is unavailable and how a sync went.
import { z } from "zod";

const ZOTERO_REFERENCE_ID = z.guid().toLowerCase().brand<"ZoteroReferenceId">();
type ZoteroReferenceId = z.infer<typeof ZOTERO_REFERENCE_ID>;

// One run of a Works Cited entry's text, italic or not. An entry is its
// runs in order.
const ENTRY_RUN = z.object({
  text: z.string(),
  italic: z.boolean(),
});
type EntryRun = z.infer<typeof ENTRY_RUN>;
const WORKS_CITED_ENTRY = z.array(ENTRY_RUN);
type WorksCitedEntry = z.infer<typeof WORKS_CITED_ENTRY>;

// The longest checkmark tag. Zotero allows longer tags; this keeps the
// setting to one short line.
const CHECKMARK_TAG_MAX = 100;
const LINE_BREAK = /[\r\n\u2028\u2029]/u;
// Eight capitals and digits, as Zotero writes an object's key.
const ZOTERO_KEY_FORM = /^[A-Z0-9]{8}$/u;
// A Zotero tag that marks a reference checked: one trimmed line.
const CHECKMARK_TAG = z
  .string()
  .trim()
  .min(1)
  .max(CHECKMARK_TAG_MAX)
  .refine((value) => !LINE_BREAK.test(value), "Use one line.");

// A Zotero collection's or item's key.
const ZOTERO_KEY = z.string().regex(ZOTERO_KEY_FORM);

// Why a list's collection can't be reached: the Zotero connection ended,
// the collection is gone, or the owner connected another Zotero account.
const UNAVAILABLE = z.enum([
  "access-ended",
  "collection-missing",
  "other-account",
]);
type Unavailable = z.infer<typeof UNAVAILABLE>;

// Why a sync failed: an unavailable collection; a connection that may not
// change the library while checkmark changes wait; Zotero not answering;
// another sync of the list already running; or a site with no Zotero
// client.
const SYNC_PROBLEM = z.enum([
  ...UNAVAILABLE.options,
  "no-write-access",
  "zotero-unavailable",
  "already-syncing",
  "not-configured",
]);
type SyncProblem = z.infer<typeof SYNC_PROBLEM>;

// A work a sync skipped: its item's key and its entry's text.
const SKIPPED_ENTRY = z.object({ key: z.string(), text: z.string() });

// How a list's latest sync went. sent counts the checkmark changes that
// Zotero confirmed. skipped holds the entries whose pending change was
// dropped because their item left the collection. A successful sync says
// how many marks made while it ran still wait; a failed one, how many
// changes it left pending.
const SYNC_RESULT = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("synced"),
    at: z.iso.datetime(),
    sent: z.number().int().nonnegative(),
    skipped: z.array(SKIPPED_ENTRY),
    waiting: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("failed"),
    at: z.iso.datetime(),
    problem: SYNC_PROBLEM,
    sent: z.number().int().nonnegative(),
    skipped: z.array(SKIPPED_ENTRY),
    waiting: z.number().int().nonnegative(),
  }),
]);
type SyncResult = z.infer<typeof SYNC_RESULT>;

export type {
  EntryRun,
  SyncProblem,
  SyncResult,
  Unavailable,
  WorksCitedEntry,
  ZoteroReferenceId,
};
export {
  CHECKMARK_TAG,
  ENTRY_RUN,
  SYNC_PROBLEM,
  SYNC_RESULT,
  UNAVAILABLE,
  WORKS_CITED_ENTRY,
  ZOTERO_KEY,
  ZOTERO_REFERENCE_ID,
};
