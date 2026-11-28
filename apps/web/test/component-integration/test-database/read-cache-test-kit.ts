// next/cache in server tests, which run no Next server: Next's own cacheTag
// and cacheLife throw outside a "use cache" scope, and its revalidateTag
// outside a request. These record instead, so a test can check that a write
// expires a tag another user's read keeps (src/db/read-cache.ts). The
// setup file (vitest.server-setup.ts) serves them as next/cache. Nothing is
// kept: every read in a server test reads the database.

type CacheLifeProfile = Parameters<typeof import("next/cache").cacheLife>[0];

const kept: string[] = [];
const expired: string[] = [];
const lifetimes: CacheLifeProfile[] = [];

function cacheTag(...tags: string[]): void {
  kept.push(...tags);
}

function cacheLife(profile: CacheLifeProfile): void {
  lifetimes.push(profile);
}

function revalidateTag(tag: string): void {
  expired.push(tag);
}

// The tags a read keeps, those of any read it makes included.
async function tagsKeptBy(
  read: () => Promise<unknown>,
): Promise<ReadonlySet<string>> {
  kept.length = 0;
  await read();
  return new Set(kept.splice(0));
}

// The tags a write expires.
async function tagsExpiredBy(
  write: () => Promise<unknown>,
): Promise<ReadonlySet<string>> {
  expired.length = 0;
  await write();
  return new Set(expired.splice(0));
}

// Whether the write expires the read, as Next would: they share a tag. The
// read runs first, before the write changes what it finds.
async function writeExpiresRead(
  read: () => Promise<unknown>,
  write: () => Promise<unknown>,
): Promise<boolean> {
  const readTags = await tagsKeptBy(read);
  const writeTags = await tagsExpiredBy(write);
  return [...writeTags].some((tag) => readTags.has(tag));
}

// The lifetimes a read keeps itself, and the reads it makes, for.
async function lifetimesOf(
  read: () => Promise<unknown>,
): Promise<readonly CacheLifeProfile[]> {
  lifetimes.length = 0;
  await read();
  return lifetimes.splice(0);
}

export type { CacheLifeProfile };
export {
  cacheLife,
  cacheTag,
  lifetimesOf,
  revalidateTag,
  tagsExpiredBy,
  tagsKeptBy,
  writeExpiresRead,
};
