// How the construct reads a task message (src/tasks/tasks-message.ts): a user
// message that a person added without it, by command or with the Tasks panel.
// The model gets it as a short note, marked so the global prompt's tasks rules
// can tell it from a request.

import type { TextPart } from "ai";
import type { TasksChangeLine } from "@/tasks/tasks.ts";
import { readTasksPart } from "@/tasks/tasks-message.ts";

// What starts each note, which the global prompt's tasks rules name.
const TASKS_NOTE_MARK = "[Tasks change]";

function quoted(text: string): string {
  return JSON.stringify(text);
}

function lineForModel(line: TasksChangeLine): string {
  switch (line.kind) {
    case "add":
      if (line.before === undefined) {
        return `added ${quoted(line.text)} at the end`;
      }
      return `added ${quoted(line.text)} before ${quoted(line.before)}`;
    case "change":
      return `changed ${quoted(line.from)} to ${quoted(line.text)}`;
    case "complete":
      return `checked off ${quoted(line.text)}`;
    case "reopen":
      return `reopened ${quoted(line.text)}`;
    case "move":
      if (line.before === undefined) {
        return `moved ${quoted(line.text)} to the end`;
      }
      return `moved ${quoted(line.text)} before ${quoted(line.before)}`;
    case "remove":
      return `removed ${quoted(line.text)}`;
    case "recur":
      if (line.recurring) {
        return `made ${quoted(line.text)} recurring`;
      }
      return `made ${quoted(line.text)} a one-off task`;
    default:
      return line satisfies never;
  }
}

// A data part of a message as the model reads it: a task message's part as
// a note, and nothing for any other data part.
function tasksPartForModel(part: {
  readonly type: string;
  readonly data: unknown;
}): TextPart | undefined {
  const tasks = readTasksPart(part);
  if (tasks === undefined) {
    return undefined;
  }
  if (tasks.kind === "card") {
    return {
      type: "text",
      text: `${TASKS_NOTE_MARK} The user showed the tasks in the conversation, without you. Nothing changed.`,
    };
  }
  const { lines, undoesVersion } = tasks.data;
  let what = "changed the tasks";
  if (undoesVersion !== undefined) {
    what = "undid an earlier change to the tasks";
  }
  return {
    type: "text",
    text: `${TASKS_NOTE_MARK} The user ${what}, without you: ${lines.map(lineForModel).join("; ")}. The tasks in your instructions is current.`,
  };
}

export { TASKS_NOTE_MARK, tasksPartForModel };
