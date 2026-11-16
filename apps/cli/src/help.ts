// The plain-text help at the root, resource and command levels, built from
// the command table so it can't drift from it.

import cliPackage from "../package.json" with { type: "json" };
import {
  COMMANDS,
  type Command,
  RESOURCES,
  type Resource,
} from "./commands.ts";

const SHARED_HELP = `Options for every command:
  --url URL          The site's address. Default: PROJECT_BUDDY_URL, or http://localhost:3000.
  --timeout SECONDS  How long to wait for the site. Default: 30, or 300 for a reply.
  -h, --help         Show help and do nothing else.

Text options, for commands that take text; give exactly one:
  --text TEXT        The text itself.
  --text-file PATH   A UTF-8 file holding the text.
  --stdin            Read the text from standard input.`;

const ROOT_FOOTER = `Environment:
  PROJECT_BUDDY_SESSION  Required. The value of the site's "session" cookie, from a browser signed in to the site.
  PROJECT_BUDDY_URL      The site's address. Default: http://localhost:3000.

Output: one JSON object per line on stdout, each with schemaVersion, type
(item, result or error), command, requestId and sequence. Every command ends
with exactly one result or error line.

Exit status: 0 success, 1 unexpected failure or failed reply, 2 invalid
input, 3 signed out, 5 not found, 6 conflict or reply in progress, 7 rate
limited, 8 network failure or deadline, 130 interrupted.`;

// The width of the resource column in the root help.
const RESOURCE_COLUMN = 13;

function commandsOf(resource: string): Command[] {
  return COMMANDS.filter((each: Command) => each.resource === resource);
}

// The help for the whole CLI.
function rootHelp(): string {
  const resources = RESOURCES.map(
    (resource: Resource) =>
      `  ${resource.name.padEnd(RESOURCE_COLUMN)} ${resource.summary}`,
  ).join("\n");
  return `Usage: project-buddy RESOURCE ACTION [TARGET] [options]

Work with your Project Buddy quests from the command line.

Resources:
${resources}

Run project-buddy RESOURCE --help for a resource's commands.

${SHARED_HELP}

${ROOT_FOOTER}
`;
}

// The help for one resource's commands.
function resourceHelp(resource: Resource): string {
  const commands = commandsOf(resource.name)
    .map(
      (each: Command) => `  project-buddy ${each.usage}\n      ${each.summary}`,
    )
    .join("\n");
  return `${resource.summary}

Commands:
${commands}

${SHARED_HELP}
`;
}

// The help for one command.
function commandHelp(found: Command): string {
  let list = "";
  if (found.list) {
    list =
      "\nWrites one item line per entry, then a result line with the count.\n";
  }
  return `Usage: project-buddy ${found.usage}

${found.summary}
${list}
${SHARED_HELP}
`;
}

function versionText(): string {
  return `project-buddy ${cliPackage.version}\n`;
}

export { commandHelp, resourceHelp, rootHelp, versionText };
