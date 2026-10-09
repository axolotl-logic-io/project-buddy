export function readDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local or run `vercel env pull`.",
    );
  }
  return url;
}
