import { createHash, timingSafeEqual } from "node:crypto";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// Compares fixed-length digests so the time taken does not reveal how much of
// the passphrase matched.
export function passphraseMatches(input: string, expected: string): boolean {
  return timingSafeEqual(sha256(input), sha256(expected));
}
