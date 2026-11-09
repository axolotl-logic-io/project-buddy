// Sentence units retain fractional reply costs; balance rounding belongs to accounting.
function amount(batteries: number): string {
  if (batteries === 1) {
    return "1 battery";
  }
  return `${batteries.toLocaleString("en-US", { maximumFractionDigits: 20 })} batteries`;
}

const BATTERIES_COPY = { amount } as const;

export { BATTERIES_COPY };
