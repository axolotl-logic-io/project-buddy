// A count as a lower-case roman numeral, as a rubricator keys a note: 1 is
// i, 4 is iv, 12 is xii.

// Each decimal digit's numeral, by place: ones, tens and hundreds.
const PLACES: readonly (readonly string[])[] = [
  ["", "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"],
  ["", "x", "xx", "xxx", "xl", "l", "lx", "lxx", "lxxx", "xc"],
  ["", "c", "cc", "ccc", "cd", "d", "dc", "dcc", "dccc", "cm"],
];

function romanNumeral(count: number): string {
  const digits = String(Math.trunc(count));
  const below = digits.slice(-PLACES.length);
  const thousands = Number(digits.slice(0, -PLACES.length) || "0");
  const rest = [...below]
    .reverse()
    .map((digit, place) => PLACES[place]?.[Number(digit)] ?? "")
    .reverse()
    .join("");
  return "m".repeat(thousands) + rest;
}

export { romanNumeral };
