// For store tests: whether a query the fake database received is scoped by
// an ownership predicate from owner-scope.ts, and whether a module's every
// export is checked for one.
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { NeonHttpQuery } from "@/db/fake-neon-http.ts";
import type { UserId } from "@/ids.ts";

const PLACEHOLDER = /\$\d+/gu;

// An insert of one row by its values, as drizzle writes it: the quoted
// column names, then each value as a placeholder or `default`.
const INSERT_BY_VALUES =
  /^insert into "[^"]+" \((?<columns>[^)]*)\) values \((?<values>[^)]*)\)/u;

const QUOTED_NAME = /^"(?<name>[^"]+)"$/u;

const NUMBERED_PLACEHOLDER = /^\$(?<position>\d+)$/u;

// The column that holds each table's own id. A row's own id never shows
// whose the row is; its other values may.
const OWN_ID_COLUMN = "id";

// The SQL with each numbered placeholder written as a bare `$`, so a
// predicate matches wherever its parameters fall in the query.
function withoutPlaceholderNumbers(text: string): string {
  return text.replaceAll(PLACEHOLDER, "$");
}

// The parameter a value of an insert stands for, or undefined for `default`.
function parameterOf(
  value: string,
  params: readonly unknown[],
): string | undefined {
  const { position } = NUMBERED_PLACEHOLDER.exec(value)?.groups ?? {};
  if (position === undefined) {
    return undefined;
  }
  const param = params[Number(position) - 1];
  if (param === undefined) {
    return undefined;
  }
  return String(param);
}

// The row a query inserts by its values, as each column's parameter, or
// undefined if the query is not an insert by values.
function insertedRow(
  query: NeonHttpQuery,
): ReadonlyMap<string, string> | undefined {
  const groups = INSERT_BY_VALUES.exec(query.query)?.groups;
  if (groups === undefined) {
    return undefined;
  }
  const { columns = "", values = "" } = groups;
  const valueList = values.split(", ");
  const row = new Map<string, string>();
  columns.split(", ").forEach((column, index) => {
    const { name } = QUOTED_NAME.exec(column)?.groups ?? {};
    const param = parameterOf(valueList[index] ?? "", query.params);
    if (name !== undefined && param !== undefined) {
      row.set(name, param);
    }
  });
  return row;
}

// Whether the row, other than its own id, names one of the owned values.
function namesOwned(
  row: ReadonlyMap<string, string>,
  owned: ReadonlySet<string>,
): boolean {
  return [...row].some(
    ([column, value]) => column !== OWN_ID_COLUMN && owned.has(value),
  );
}

// An export that takes no owner on purpose, and why. It is the export
// itself rather than its name, so one renamed or removed fails to compile.
type Unscoped = readonly [allowed: unknown, reason: string];

// A module that reads or writes user data, and how each export is checked.
export interface DataModule {
  readonly path: string;
  readonly exports: Readonly<Record<string, unknown>>;
  // What scopes a query of this module to the owner's data.
  readonly ownerPredicates: readonly SQL[];
  // Each export that must keep to the owner's data, called for the owner.
  readonly scoped: Readonly<Record<string, () => Promise<unknown>>>;
  // Each export that takes no owner on purpose, and why.
  readonly unscoped: readonly Unscoped[];
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

// The queries, of those one call sent in order, that are not scoped to
// owner's data. A query is scoped when it holds one of ownerPredicates, or
// when it inserts a row whose values name owner, or name a row that an
// earlier query of the call inserted that way: a new project of owner's,
// then its first chat, then that chat's first message.
export function queriesNotOwnedBy(
  owner: UserId,
  ownerPredicates: readonly SQL[],
  queries: readonly NeonHttpQuery[],
): NeonHttpQuery[] {
  const owned = new Set<string>([owner]);
  return queries.filter((query) => {
    if (ownerPredicates.some((predicate) => holdsPredicate(query, predicate))) {
      return false;
    }
    const row = insertedRow(query);
    if (row === undefined || !namesOwned(row, owned)) {
      return true;
    }
    const id = row.get(OWN_ID_COLUMN);
    if (id !== undefined) {
      owned.add(id);
    }
    return false;
  });
}

// Of a module's exports, the names of those neither checked (named in
// checked) nor allowed (their values in allowed); of those both; and the
// entries of either list that are no export, a checked one by its name and
// an allowed one by its place in allowed.
export function exportCoverage(
  exports: Readonly<Record<string, unknown>>,
  checked: readonly string[],
  allowed: readonly unknown[],
): { unchecked: string[]; twice: string[]; stale: string[] } {
  const exported = Object.entries(exports);
  const values = Object.values(exports);
  return {
    unchecked: exported
      .filter(
        ([name, value]) => !(checked.includes(name) || allowed.includes(value)),
      )
      .map(([name]) => name),
    twice: exported
      .filter(
        ([name, value]) => checked.includes(name) && allowed.includes(value),
      )
      .map(([name]) => name),
    stale: [
      ...checked.filter((name) => !Object.hasOwn(exports, name)),
      ...allowed.flatMap((value, index) => {
        if (values.includes(value)) {
          return [];
        }
        return [`allowed[${index}]`];
      }),
    ],
  };
}
