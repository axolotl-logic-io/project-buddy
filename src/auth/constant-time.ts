const ENCODER = new TextEncoder();
const HMAC_SHA256: HmacKeyGenParams = { name: "HMAC", hash: "SHA-256" };

// Whether two strings are equal, taking the same time however much of them
// matches and whatever their lengths. Both are signed with a fresh random
// key, and Web Crypto compares the signatures in constant time.
export async function constantTimeEqual(
  actual: string,
  expected: string,
): Promise<boolean> {
  const key = await crypto.subtle.generateKey(HMAC_SHA256, false, [
    "sign",
    "verify",
  ]);
  const expectedSignature = await crypto.subtle.sign(
    HMAC_SHA256.name,
    key,
    ENCODER.encode(expected),
  );
  return crypto.subtle.verify(
    HMAC_SHA256.name,
    key,
    expectedSignature,
    ENCODER.encode(actual),
  );
}
