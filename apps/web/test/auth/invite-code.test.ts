// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type {
  clearWrongInviteCodes,
  countWrongInviteCode,
  isLockedOutOfInviteCode,
} from "@/accounts/rate-limits.ts";
import { checkInviteCode } from "@/auth/invite-code.ts";
import { AppError } from "@/errors/app-error.ts";

const rateLimits = vi.hoisted(() => ({
  isLockedOutOfInviteCode: vi.fn<typeof isLockedOutOfInviteCode>(),
  countWrongInviteCode: vi.fn<typeof countWrongInviteCode>(),
  clearWrongInviteCodes: vi.fn<typeof clearWrongInviteCodes>(),
}));
vi.mock("@/accounts/rate-limits.ts", () => rateLimits);

const INVITE_CODE = "open sesame";
const CLIENT_KEY = "203.0.113.7";
const NOW = new Date("2026-10-10T12:00:00.000Z");

beforeEach(() => {
  vi.stubEnv("INVITE_CODE", INVITE_CODE);
  rateLimits.isLockedOutOfInviteCode.mockResolvedValue(false);
  rateLimits.countWrongInviteCode.mockResolvedValue();
  rateLimits.clearWrongInviteCodes.mockResolvedValue();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("checkInviteCode", () => {
  test("takes the right code, clearing the client's wrong ones", async () => {
    expect(await checkInviteCode(INVITE_CODE, CLIENT_KEY, NOW)).toBe("right");
    expect(rateLimits.isLockedOutOfInviteCode).toHaveBeenCalledWith(
      CLIENT_KEY,
      NOW,
    );
    expect(rateLimits.clearWrongInviteCodes).toHaveBeenCalledWith(CLIENT_KEY);
    expect(rateLimits.countWrongInviteCode).not.toHaveBeenCalled();
  });

  test("refuses a wrong code, counting it against the client", async () => {
    expect(await checkInviteCode("guess", CLIENT_KEY, NOW)).toBe("wrong");
    expect(rateLimits.countWrongInviteCode).toHaveBeenCalledWith(
      CLIENT_KEY,
      NOW,
    );
    expect(rateLimits.clearWrongInviteCodes).not.toHaveBeenCalled();
  });

  test("refuses even the right code from a locked-out client, counting nothing", async () => {
    rateLimits.isLockedOutOfInviteCode.mockResolvedValue(true);

    expect(await checkInviteCode(INVITE_CODE, CLIENT_KEY, NOW)).toBe(
      "locked-out",
    );
    expect(rateLimits.countWrongInviteCode).not.toHaveBeenCalled();
    expect(rateLimits.clearWrongInviteCodes).not.toHaveBeenCalled();
  });

  test("passes on the storage failure when the lockout can't be read", async () => {
    const failure = new AppError(
      "database-unreachable",
      new Error("fetch failed"),
    );
    rateLimits.isLockedOutOfInviteCode.mockRejectedValue(failure);

    await expect(checkInviteCode(INVITE_CODE, CLIENT_KEY, NOW)).rejects.toBe(
      failure,
    );
  });
});
