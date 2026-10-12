// For store tests: whether a query the fake database received is scoped by
// an ownership predicate from owner-scope.ts.
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { NeonHttpQuery } from "@/db/fake-neon-http.ts";

const PLACEHOLDER = /\$\d+/gu;

// The SQL with each numbered placeholder written as a bare `$`, so a
// predicate matches wherever its parameters fall in the query.
function withoutPlaceholderNumbers(text: string): string {
  return text.replaceAll(PLACEHOLDER, "$");
}

// Whether the query holds the predicate's SQL, with the predicate's
// parameters among its own.
export function holdsPredicate(
  query: NeonHttpQuery | undefined,
  predicate: SQL,
): boolean {
  if (query === undefined) {
    return false;
  }
  const rendered = new PgDialect().sqlToQuery(predicate);
  const params = query.params.map(String);
  return (
    withoutPlaceholderNumbers(query.query).includes(
      withoutPlaceholderNumbers(rendered.sql),
    ) && rendered.params.every((param) => params.includes(String(param)))
  );
}
