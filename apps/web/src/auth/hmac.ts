// HMAC-SHA256 over UTF-8 strings, through Web Crypto so that it runs in the
// proxy as well as in Node.
const ENCODER = new TextEncoder();
const HMAC_SHA256: HmacImportParams & HmacKeyGenParams = {
  name: "HMAC",
  hash: "SHA-256",
};

// The HMAC-SHA256 of the message, keyed by the secret.
async function hmacSha256(
  secret: string,
  message: string,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    ENCODER.encode(secret),
    HMAC_SHA256,
    false,
    ["sign"],
  );
  return crypto.subtle.sign(HMAC_SHA256.name, key, ENCODER.encode(message));
}

// Whether two strings are equal, taking the same time however much of them
// matches and whatever their lengths. Both are signed with a fresh random
// key, and Web Crypto compares the signatures in constant time.
async function constantTimeEqual(
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

export { constantTimeEqual, hmacSha256 };
