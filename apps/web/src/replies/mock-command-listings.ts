// The mock model's commands (MOCK_COMMANDS in mock-script.ts) as the
// composer's command list shows them, while the mock model runs, so its
// `/mock-…` commands are as easy to find as the built-in ones. They still go
// to the construct as messages.
import { readConstructModel } from "@/env.ts";
import { MOCK_COMMANDS } from "@/replies/mock-script.ts";

// A usage line: the command in backticks, then what it does.
const USAGE_LINE = /^`(?<usage>[^`]+)`[:\s]*(?<description>[\s\S]*)$/u;

// What the list shows for a command: its name as typed, how to write it and
// what it does.
interface MockCommandListing {
  readonly command: string;
  readonly usage: string;
  readonly description: string;
}

// The mock model's commands, or none while constructs run on Claude.
function mockCommandListings(): readonly MockCommandListing[] {
  if (readConstructModel() !== "mock") {
    return [];
  }
  return MOCK_COMMANDS.map(({ name, usage }) => {
    const command = `/mock-${name}`;
    const { usage: written = command, description = "" } =
      USAGE_LINE.exec(usage)?.groups ?? {};
    return { command, usage: written, description: description.trim() };
  });
}

export type { MockCommandListing };
export { mockCommandListings };
