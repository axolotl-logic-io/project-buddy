// For tests: spies on the error log that toAppError writes to, and keeps the
// output out of the test report.
import { type MockInstance, vi } from "vitest";

export function spyOnErrorLog(): MockInstance<Console["error"]> {
  return vi.spyOn(console, "error").mockImplementation(() => {
    // Tests read the recorded calls; printing them would only add noise.
  });
}
