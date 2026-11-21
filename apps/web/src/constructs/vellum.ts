import type { Construct } from "@/constructs/construct.ts";

export const vellum: Construct = {
  id: "vellum",
  name: "Vellum",
  description:
    "A calm clockwork cartographer who charts each quest as a map, from known ground to the edge of the unknown.",
  definition: {
    visual: {
      version: 1,
      description:
        "A pencil and ink sketch on aged parchment of Vellum, a small clockwork cartographer: a brass automaton with a rounded head, round glass lens eyes, visible gears at the joints, ink-stained fingers holding a quill and a rolled map. Compass rose etched on its chest, tiny cogs ticking at the shoulder. Warm sepia ink, fine cross-hatching, hand-drawn map margins with faint coastlines and dotted routes, a calm, patient, friendly expression.",
      canonical: { kind: "built-in", artwork: "vellum" },
    },
  },
};
