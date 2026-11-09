import { describe, expect, test } from "vitest";
import { userMessage } from "@/errors/app-error.ts";
import { goldOfMicroUsd, wholeGold } from "@/gold/gold.ts";
import { ACCOUNT_COPY } from "@/ui/copy/account.ts";
import { BATTERIES_COPY } from "@/ui/copy/batteries.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { VISUAL_COPY } from "@/ui/copy/construct-visuals.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";

const STARTING_BALANCE = 100;
const TINY_COST = 0.000_001;
const FRACTIONAL_COST = 1.25;
const STARTING_MICRO_USD = 1_000_000;
const ONE_BATTERY_MICRO_USD = 10_000;
const BELOW_ONE_BATTERY = 9999;

describe("battery amounts", () => {
  test.each([
    [0, "0 batteries"],
    [1, "1 battery"],
    [STARTING_BALANCE, "100 batteries"],
    [TINY_COST, "0.000001 batteries"],
    [FRACTIONAL_COST, "1.25 batteries"],
  ])("names %s in sentences", (amount, words) => {
    expect(BATTERIES_COPY.amount(amount)).toBe(words);
    expect(CHAT_COPY.replyCost(amount)).toContain(`Reply cost: ${words} (`);
    expect(VISUAL_COPY.reservation(amount)).toContain(`${words} before`);
  });

  test("reservation refusal names each amount independently", () => {
    expect(GENERATION_COPY.reservationRefused(1, 0)).toBe(
      "Images reserve 1 battery; 0 batteries available for this request. Replies still spend batteries.",
    );
    expect(GENERATION_COPY.reservationRefused(STARTING_BALANCE, 1)).toContain(
      "100 batteries; 1 battery available",
    );
  });

  test("balance presentation keeps existing accounting precision and rounding", () => {
    expect(ACCOUNT_COPY.gold(wholeGold(STARTING_MICRO_USD))).toBe(
      "Batteries: 100",
    );
    expect(ACCOUNT_COPY.gold(wholeGold(ONE_BATTERY_MICRO_USD))).toBe(
      "Batteries: 1",
    );
    expect(ACCOUNT_COPY.gold(wholeGold(BELOW_ONE_BATTERY))).toBe(
      "Batteries: 0",
    );
    expect(ACCOUNT_COPY.gold(wholeGold(-1))).toBe("Batteries: 0");
    expect(CHAT_COPY.replyCost(goldOfMicroUsd(1))).toContain(
      "0.0001 batteries",
    );
  });

  test("compatibility refusal code shows current terminology", () => {
    expect(userMessage("out-of-gold")).toContain("You're out of batteries.");
    expect(GENERATION_COPY.outOfGold).toContain("batteries");
    expect(GENERATION_COPY.quotaUsedUp).toBe(GENERATION_COPY.outOfGold);
  });
});
