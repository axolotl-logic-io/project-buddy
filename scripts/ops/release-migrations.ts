// Sorts a release's new migrations by whether the build that is live can run
// on the schema they leave, as docs/project-practices.md asks: the release
// workflow migrates while the old build still serves production.
//
// A statement is additive when the live build can't notice it: a new table,
// type, sequence or enum value, a nullable or defaulted column, a plain
// index, or a unique index or foreign key on a table the same release makes.
// Anything else, such as a drop, a rename, a type change or a new NOT NULL,
// needs a person: `mise deploy` stops and lists it.

const BREAKPOINT = "--> statement-breakpoint";
const TRAILING_SEMICOLON = /;$/u;
const WHITESPACE = /\s+/gu;
const HAS_DEFAULT = /\bDEFAULT\b/iu;
// A column the live build's inserts would have to fill.
const REQUIRES_VALUE = /\bNOT NULL\b|\bPRIMARY KEY\b/iu;

// A table, type or index name with its quotes and schema removed:
// "public"."quests" becomes quests.
function bareName(name: string): string {
  const parts = name.replaceAll('"', "").split(".");
  return parts.at(-1) ?? name;
}

function statementsOf(sql: string): string[] {
  return sql
    .split(BREAKPOINT)
    .map((statement) =>
      statement
        .trim()
        .replace(TRAILING_SEMICOLON, "")
        .replaceAll(WHITESPACE, " "),
    )
    .filter((statement) => statement !== "");
}

const CREATE_TABLE =
  /^CREATE TABLE (?:IF NOT EXISTS )?(?<table>"[^"]+"(?:\."[^"]+")?|\S+)/iu;
const CREATE_OBJECT =
  /^CREATE (?<kind>TYPE|SEQUENCE|SCHEMA) (?:IF NOT EXISTS )?(?<name>\S+)/iu;
const CREATE_INDEX =
  /^CREATE (?<unique>UNIQUE )?INDEX (?:CONCURRENTLY )?(?:IF NOT EXISTS )?(?<name>\S+) ON (?:ONLY )?(?<table>\S+)/iu;
const ADD_ENUM_VALUE =
  /^ALTER TYPE (?<type>\S+) ADD VALUE (?:IF NOT EXISTS )?'(?<value>[^']*)'/iu;
const ADD_COLUMN =
  /^ALTER TABLE (?:ONLY )?(?<table>\S+) ADD COLUMN (?:IF NOT EXISTS )?(?<column>\S+) (?<definition>.*)$/iu;
const ADD_FOREIGN_KEY =
  /^ALTER TABLE (?:ONLY )?(?<table>\S+) ADD CONSTRAINT (?<name>\S+) FOREIGN KEY /iu;

// What an additive statement does, or undefined when it needs review.
// newTables holds the tables this release makes.
function additiveChange(
  statement: string,
  newTables: ReadonlySet<string>,
): string | undefined {
  const { table } = CREATE_TABLE.exec(statement)?.groups ?? {};
  if (table) {
    return `makes the table \`${bareName(table)}\``;
  }
  const { kind, name } = CREATE_OBJECT.exec(statement)?.groups ?? {};
  if (kind && name) {
    return `makes the ${kind.toLowerCase()} \`${bareName(name)}\``;
  }
  const {
    name: indexName,
    table: indexTable,
    unique,
  } = CREATE_INDEX.exec(statement)?.groups ?? {};
  if (indexName && indexTable) {
    return indexChange(indexName, indexTable, unique, newTables);
  }
  const { type, value } = ADD_ENUM_VALUE.exec(statement)?.groups ?? {};
  if (type && value !== undefined) {
    return `adds the value '${value}' to \`${bareName(type)}\``;
  }
  const {
    table: columnTable,
    column,
    definition,
  } = ADD_COLUMN.exec(statement)?.groups ?? {};
  if (columnTable && column && definition !== undefined) {
    return columnChange(columnTable, column, definition);
  }
  const { table: keyed } = ADD_FOREIGN_KEY.exec(statement)?.groups ?? {};
  if (keyed && newTables.has(bareName(keyed))) {
    return `adds a foreign key to the new table \`${bareName(keyed)}\``;
  }
  return undefined;
}

// A unique index can refuse the live build's writes, so it is additive only
// on a table the release makes.
function indexChange(
  name: string,
  table: string,
  unique: string | undefined,
  newTables: ReadonlySet<string>,
): string | undefined {
  const onTable = bareName(table);
  if (unique === undefined) {
    return `adds the index \`${bareName(name)}\` on \`${onTable}\``;
  }
  if (!newTables.has(onTable)) {
    return undefined;
  }
  return `adds the unique index \`${bareName(name)}\` on \`${onTable}\``;
}

// A column the live build's inserts leave out must take a default or null.
function columnChange(
  table: string,
  column: string,
  definition: string,
): string | undefined {
  const name = `\`${bareName(table)}.${bareName(column)}\``;
  if (HAS_DEFAULT.test(definition)) {
    return `adds the defaulted column ${name}`;
  }
  if (REQUIRES_VALUE.test(definition)) {
    return undefined;
  }
  return `adds the nullable column ${name}`;
}

// One migration file's name, such as 0095_quest_notes, and its SQL.
export interface Migration {
  readonly name: string;
  readonly sql: string;
}

export interface ClassifiedMigration {
  readonly name: string;
  // What each additive statement does, in words for the release PR.
  readonly additive: readonly string[];
  // The statements the live build might not run with, verbatim.
  readonly needsReview: readonly string[];
}

export function classifyMigrations(
  migrations: readonly Migration[],
): ClassifiedMigration[] {
  const newTables = new Set<string>();
  for (const migration of migrations) {
    for (const statement of statementsOf(migration.sql)) {
      const { table } = CREATE_TABLE.exec(statement)?.groups ?? {};
      if (table) {
        newTables.add(bareName(table));
      }
    }
  }
  return migrations.map((migration) => {
    const additive: string[] = [];
    const needsReview: string[] = [];
    for (const statement of statementsOf(migration.sql)) {
      const description = additiveChange(statement, newTables);
      if (description === undefined) {
        needsReview.push(statement);
      } else {
        additive.push(description);
      }
    }
    return { name: migration.name, additive, needsReview };
  });
}
