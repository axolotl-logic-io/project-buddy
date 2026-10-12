// Temporary: proves that splitting src/ui/copy.ts into the area modules in
// src/ui/copy/ kept every string. The fixture is the aggregate's content before
// the split, with each
// function called on fixed sample arguments.
import { expect, test } from "vitest";
import {
  CHAT_COPY,
  CHAT_NAME_COPY,
  CITATIONS_COPY,
  NEW_CHAT_COPY,
  OPENING_COPY,
  TOOL_FAILURES_COPY,
} from "@/ui/copy/chat.ts";
import { FOOTER_COPY } from "@/ui/copy/footer.ts";
import { LOGIN_COPY } from "@/ui/copy/login.ts";
import { MEMORY_COPY } from "@/ui/copy/memory.ts";
import { PROBLEMS_COPY } from "@/ui/copy/problems.ts";
import { PROJECT_COPY, PROJECTS_COPY } from "@/ui/copy/projects.ts";
import { HOME_COPY, SITE_COPY } from "@/ui/copy/site.ts";
import { THEME_COPY } from "@/ui/copy/theme.ts";
import BEFORE_SPLIT from "./copy-split.fixture.json" with { type: "json" };

// Every copy function takes at most two arguments; strings stand in for the
// names, numbers and links they are given.
const SAMPLE_ARGUMENTS = ["‹first›", "‹second›"] as const;

function serialize(value: unknown): unknown {
  if (typeof value === "function") {
    return {
      called: serialize(Reflect.apply(value, undefined, SAMPLE_ARGUMENTS)),
    };
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serialize(entry)]),
    );
  }
  return value;
}

// The area modules' sections, under the names and in the order the aggregate
// had them.
const AFTER_SPLIT: Record<string, unknown> = {
  site: SITE_COPY,
  footer: FOOTER_COPY,
  theme: THEME_COPY,
  home: HOME_COPY,
  login: LOGIN_COPY,
  projects: PROJECTS_COPY,
  project: PROJECT_COPY,
  newChat: NEW_CHAT_COPY,
  chat: CHAT_COPY,
  citations: CITATIONS_COPY,
  toolFailures: TOOL_FAILURES_COPY,
  problems: PROBLEMS_COPY,
  memory: MEMORY_COPY,
  chatName: CHAT_NAME_COPY,
  opening: OPENING_COPY,
};

test("the area modules keep every string", () => {
  expect(serialize(AFTER_SPLIT)).toStrictEqual(BEFORE_SPLIT);
});
