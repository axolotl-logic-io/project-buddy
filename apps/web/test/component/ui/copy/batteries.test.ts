import { describe, expect, test } from "vitest";
import { userMessage } from "@/errors/app-error.ts";
import { goldOfMicroUsd, wholeGold } from "@/gold/gold.ts";
import { BATTERIES_COPY } from "@/ui/copy/batteries.ts";
import { CHAT_COPY } from "@/ui/copy/chat.ts";
import { GENERATION_COPY } from "@/ui/copy/generation.ts";

const STARTING_BALANCE = 100;
const TINY_COST = 0.000_001;
const FRACTIONAL_COST = 1.25;
const REPLY_COST = 4.6807;
const NEARLY_ONE = 0.96;
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
  });

  test.each([
    [0, "0 batteries"],
    [1, "1 battery"],
    [REPLY_COST, "4.7 batteries"],
    [NEARLY_ONE, "1 battery"],
    [FRACTIONAL_COST, "1.3 batteries"],
    [TINY_COST, "less than 0.1 batteries"],
  ])("a reply that cost %s shows one decimal place", (amount, words) => {
    expect(CHAT_COPY.replyCost(amount)).toBe(`Reply cost: ${words}.`);
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
    expect(wholeGold(STARTING_MICRO_USD)).toBe(STARTING_BALANCE);
    expect(wholeGold(ONE_BATTERY_MICRO_USD)).toBe(1);
    expect(wholeGold(BELOW_ONE_BATTERY)).toBe(0);
    expect(wholeGold(-1)).toBe(0);
    expect(BATTERIES_COPY.amount(goldOfMicroUsd(1))).toBe("0.0001 batteries");
  });

  test("compatibility refusal code shows current terminology", () => {
    expect(userMessage("out-of-gold")).toContain("You're out of batteries.");
    expect(GENERATION_COPY.outOfGold).toContain("batteries");
    expect(GENERATION_COPY.quotaUsedUp).toBe(GENERATION_COPY.outOfGold);
  });
});
