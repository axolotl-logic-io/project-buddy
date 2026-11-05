// A spell as the construct's list of spells gives it: its id, its name and when
// to use it; never its instructions, which only a cast gives.

// A spell as a choice: its id, a built-in spell's or an own spell's, its
// name and its when-to-use line.
interface SpellChoice {
  readonly id: string;
  readonly name: string;
  readonly whenToUse: string;
}

export type { SpellChoice };
