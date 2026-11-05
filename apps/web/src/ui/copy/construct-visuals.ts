const VISUAL_COPY = {
  heading: "Visuals",
  description: "Visual description",
  descriptionHelp:
    "Describe the construct’s appearance and identity. This is separate from its conversational prompt. At most 4,000 characters; placeholders stay literal.",
  requiredDescription: "Keep a Visual description for this construct’s images.",
  generate: "Generate Images",
  resume: "Resume original request",
  unclaimed:
    "The original request has not started. Resume it with the same saved description and request ID. This can reserve gold; it does not start a second paid request.",
  retry: "Retry generation",
  check: "Check generation status",
  saveFirst: "Save your changes before generating images.",
  needsDescription: "Save a Visual description before generating images.",
  explanation:
    "Generate one image and reuse its framing for the avatar, portrait, opening and working appearance. Existing images stay until a replacement succeeds.",
  roles: {
    avatar: "Avatar",
    portrait: "Portrait",
    opening: "Opening",
    working: "Working",
  },
  roleStates: { pending: "Pending", generated: "Generated", failed: "Failed" },
  states: {
    generated:
      "Your new images are ready. Existing adventures keep their images.",
    pending:
      "Generation is pending. Check its status before starting another request.",
    failed:
      "Generation failed. Your previous images are kept. Retry starts a new request that can spend gold.",
    unavailable:
      "Image generation is unavailable. Your previous images are kept.",
    outOfGold: "You’re out of gold. Your previous images are kept.",
    "not-found": "This construct could not be found.",
    stale:
      "The construct changed during generation. These results were not applied. Your previous images are kept.",
  },
  unknown:
    "The request may still be running. Check its status before starting another request; do not submit again.",
  reservation: (gold: number): string =>
    `Generation reserves ${gold.toLocaleString("en-US")} gold before it starts. Unused gold is returned.`,
  outdated:
    "These images are out of date for the saved prompt or Visual description. Generate replacements when you are ready.",
};

export { VISUAL_COPY };
