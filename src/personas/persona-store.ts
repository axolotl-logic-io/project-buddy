// The personas of a user's own, stored in Postgres, each its owner's alone:
// every function takes the owner first and reads or writes only the owner's
// personas. An id from outside the code, such as a route parameter, is looked
// up as a string; anything malformed, unknown or another user's is not found.
// A persona starts as a clone of a built-in persona or of another of the
// owner's, and a chat keeps a snapshot of its persona (src/chats/), so
// editing or deleting a persona changes no chat.
import { and, asc, eq, type SQL, sql } from "drizzle-orm";
import { personaOwnedBy } from "@/accounts/owner-scope.ts";
import { getDb } from "@/db/client.ts";
import { personas } from "@/db/tables/personas.ts";
import { withAppErrors } from "@/errors/to-app-error.ts";
import { parseUserPersonaId, type UserId, type UserPersonaId } from "@/ids.ts";
import {
  getPersona,
  isPersonaId,
  type PersonaParts,
  type PersonaSnapshot,
} from "@/personas/index.ts";
import { parsePersonaParts } from "@/personas/persona-parts-schema.ts";

// A persona of the user's own. clonedFrom is the id of the persona it was
// cloned from, a built-in persona's or a persona's of the user's own, which
// may since have been deleted.
interface UserPersona extends PersonaSnapshot {
  readonly id: UserPersonaId;
  readonly clonedFrom: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// What an edit changes: the name, the parts, or both.
interface PersonaEdit {
  readonly name?: string;
  readonly parts?: PersonaParts;
}

type PersonaRow = typeof personas.$inferSelect;

// The suffix of a clone's name, after its source's.
const COPY_SUFFIX = " (copy)";

// Rows as personas. A row whose parts are not every part, which only a
// hand-edited row could hold, is skipped, as is one whose id is not a UUID,
// though the uuid column never holds one.
function toPersonas(rows: readonly PersonaRow[]): UserPersona[] {
  return rows.flatMap((row) => {
    const id = parseUserPersonaId(row.id);
    const parts = parsePersonaParts(row.parts);
    if (id === undefined || parts === undefined) {
      return [];
    }
    return [
      {
        id,
        name: row.name,
        parts,
        clonedFrom: row.clonedFrom ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    ];
  });
}

// A `personas` row: the owner's persona with this id.
function ownedPersona(owner: UserId, id: UserPersonaId): SQL | undefined {
  return and(eq(personas.id, id), personaOwnedBy(owner));
}

// The persona with this id that the owner may clone: a built-in persona, or
// one of the owner's own.
function cloneSource(
  owner: UserId,
  sourceId: string,
): Promise<PersonaSnapshot | undefined> {
  if (isPersonaId(sourceId)) {
    return Promise.resolve(getPersona(sourceId));
  }
  return getUserPersona(owner, sourceId);
}

// The owner's personas, oldest first.
export function listPersonas(owner: UserId): Promise<UserPersona[]> {
  return withAppErrors("listPersonas", async () =>
    toPersonas(
      await getDb()
        .select()
        .from(personas)
        .where(personaOwnedBy(owner))
        .orderBy(asc(personas.createdAt), asc(personas.id)),
    ),
  );
}

// The owner's persona with this id, or undefined if the id is malformed,
// unknown or another user's.
export async function getUserPersona(
  owner: UserId,
  id: string,
): Promise<UserPersona | undefined> {
  const personaId = parseUserPersonaId(id);
  if (personaId === undefined) {
    return undefined;
  }
  const [persona] = await withAppErrors("getUserPersona", async () =>
    toPersonas(
      await getDb()
        .select()
        .from(personas)
        .where(ownedPersona(owner, personaId)),
    ),
  );
  return persona;
}

// A new persona of the owner's, a copy of the persona with the id sourceId,
// named as it is with " (copy)" after: a built-in persona, or one of the
// owner's own. Undefined, saving nothing, if the source is none of those,
// such as another user's persona.
export async function clonePersona(
  owner: UserId,
  sourceId: string,
): Promise<UserPersona | undefined> {
  const source = await cloneSource(owner, sourceId);
  if (source === undefined) {
    return undefined;
  }
  const [clone] = await withAppErrors("clonePersona", async () =>
    toPersonas(
      await getDb()
        .insert(personas)
        .values({
          userId: owner,
          name: `${source.name}${COPY_SUFFIX}`,
          parts: source.parts,
          clonedFrom: sourceId.toLowerCase(),
        })
        .returning(),
    ),
  );
  return clone;
}

// The owner's persona with this id, edited, or undefined, changing nothing,
// if the id is malformed, unknown or another user's.
export async function updatePersona(
  owner: UserId,
  id: string,
  edit: PersonaEdit,
): Promise<UserPersona | undefined> {
  const personaId = parseUserPersonaId(id);
  if (personaId === undefined) {
    return undefined;
  }
  const [persona] = await withAppErrors("updatePersona", async () =>
    toPersonas(
      await getDb()
        .update(personas)
        .set({ name: edit.name, parts: edit.parts, updatedAt: sql`now()` })
        .where(ownedPersona(owner, personaId))
        .returning(),
    ),
  );
  return persona;
}

// Deletes the owner's persona with this id. False, deleting nothing, if the
// id is malformed, unknown or another user's.
export async function deletePersona(
  owner: UserId,
  id: string,
): Promise<boolean> {
  const personaId = parseUserPersonaId(id);
  if (personaId === undefined) {
    return false;
  }
  const deleted = await withAppErrors("deletePersona", async () =>
    getDb()
      .delete(personas)
      .where(ownedPersona(owner, personaId))
      .returning({ id: personas.id }),
  );
  return deleted.length > 0;
}

export type { PersonaEdit, UserPersona };
