type Env = Record<string, string | undefined>;

function readRequired(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local or run \`vercel env pull\`.`,
    );
  }
  return value;
}

// The passphrase that unlocks the site at /login.
export function readSitePassphrase(env: Env = process.env): string {
  return readRequired(env, "SITE_PASSPHRASE");
}

// The HMAC key that signs the session cookie.
export function readSessionSecret(env: Env = process.env): string {
  return readRequired(env, "SESSION_SECRET");
}
