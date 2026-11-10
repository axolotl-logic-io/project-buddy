// Sentence units keep every fraction they are given; balance rounding belongs
// to accounting.
function amount(batteries: number): string {
  if (batteries === 1) {
    return "1 battery";
  }
  return `${batteries.toLocaleString("en-US", { maximumFractionDigits: 20 })} batteries`;
}

// A reply's cost to one decimal place. A cost too small to show at that
// precision reads "less than 0.1 batteries", never zero.
function tenths(batteries: number): string {
  const shown = batteries.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  });
  if (shown === "0" && batteries > 0) {
    return "less than 0.1 batteries";
  }
  if (shown === "1") {
    return "1 battery";
  }
  return `${shown} batteries`;
}

const BATTERIES_COPY = { amount, tenths } as const;

export { BATTERIES_COPY };
