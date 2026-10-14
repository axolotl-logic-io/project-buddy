// "/mock-slow <message>" makes the mock tutor wait before it starts its
// reply, so end-to-end tests can do something while the tutor is still
// replying, such as send another message from a second tab.
import type { MockStep } from "@/tutor/mock-script.ts";

// How long the slow reply waits before its first word: long enough for a
// test to open the chat elsewhere and get a reply there first.
const MOCK_SLOW_DELAY_MS = 8000;

// The reply to /mock-slow: one text step quoting message, which starts
// streaming only after MOCK_SLOW_DELAY_MS.
function mockSlowReply(message: string): MockStep[] {
  return [
    {
      text: `The mock tutor took its time. You said: "${message}".`,
      toolCalls: [],
      delayMs: MOCK_SLOW_DELAY_MS,
    },
  ];
}

export { MOCK_SLOW_DELAY_MS, mockSlowReply };
