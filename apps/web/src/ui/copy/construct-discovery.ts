import type { Construct } from "@/constructs/construct.ts";

const CONSTRUCT_DISCOVERY_COPY = {
  openProfile: (name: string): string => `About ${name}`,
  closeProfile: "Close character profile",
  temperament: "Temperament",
  approach: "Approach to quests",
  vellum: {
    temperament:
      "Calm, patient and precise, with a warm curiosity for what lies ahead.",
    approach:
      "Charts what you know, marks what is uncertain and helps you find the next step toward your goal.",
    sample:
      "Let us unroll a fresh sheet. Before I draw a single road, tell me where you hope to arrive.",
  },
  lumen: {
    temperament:
      "Bright, eager and full of sparks, with care for ideas that need a slower glow.",
    approach:
      "Finds connections, explores possibilities and helps you choose one idea to light up first.",
    sample:
      "Wait, wait. Something just lit up. What if we did this part first?",
  },
};

// Each built-in construct's public character copy.
function constructPersonality(
  construct: Construct,
): typeof CONSTRUCT_DISCOVERY_COPY.vellum {
  return CONSTRUCT_DISCOVERY_COPY[construct.id];
}

export { CONSTRUCT_DISCOVERY_COPY, constructPersonality };
