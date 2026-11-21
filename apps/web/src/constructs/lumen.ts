import type { Construct } from "@/constructs/construct.ts";

export const lumen: Construct = {
  id: "lumen",
  name: "Lumen",
  description:
    "A crackling mote of arcane light that lights up every idea and every dark corner of a quest.",
  definition: {
    visual: {
      version: 1,
      description:
        "Character portrait of Lumen, a small mote of living arcane light, a glowing radiant orb of golden-white energy with crackling sparks and tiny lightning filaments, floating at the center of a ring of turning glowing runes made of ancient metal and etched symbols. Runes orbit like a gyroscope, casting warm and cool light. Eager, lively, bright personality conveyed through flaring light and little sparks trailing off. Dark deep indigo background with soft bokeh motes of light, magical fantasy illustration, painterly, highly detailed, luminous glow, centered composition.",
      canonical: { kind: "built-in", artwork: "lumen" },
    },
  },
};
