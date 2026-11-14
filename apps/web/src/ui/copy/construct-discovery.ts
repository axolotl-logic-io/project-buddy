import type { ConstructSnapshot } from "@/constructs/construct.ts";
import { getConstruct } from "@/constructs/index.ts";

const CONSTRUCT_DISCOVERY_COPY = {
  openProfile: (name: string): string => `About ${name}`,
  closeProfile: "Close character profile",
  temperament: "Temperament",
  approach: "Approach to quests",
  own: {
    temperament: "A construct of your own, with its saved name and appearance.",
    approach:
      "Explore ideas, ask questions and work through your next step together.",
    sample: "Where would you like to begin?",
  },
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

// Public character copy follows explicit artwork identity, never a private
// prompt, visual description, source id or a name that happens to match.
function constructPersonality(
  construct: ConstructSnapshot,
): typeof CONSTRUCT_DISCOVERY_COPY.own {
  const asset = construct.definition.visual?.canonical;
  if (asset?.kind === "built-in") {
    if (
      asset.artwork === "vellum-v1" &&
      construct.definition.prompt === getConstruct("vellum").definition.prompt
    ) {
      return CONSTRUCT_DISCOVERY_COPY.vellum;
    }
    if (
      asset.artwork === "lumen-v1" &&
      construct.definition.prompt === getConstruct("lumen").definition.prompt
    ) {
      return CONSTRUCT_DISCOVERY_COPY.lumen;
    }
  }
  return CONSTRUCT_DISCOVERY_COPY.own;
}

export { CONSTRUCT_DISCOVERY_COPY, constructPersonality };
