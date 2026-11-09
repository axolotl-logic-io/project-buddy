const VISUAL_COPY = {
  restore: "Restore previous artwork",
  restoreHint:
    "Restore the previous artwork and its Visual description without spending gold. Save or discard text edits first. Existing adventures and Marketplace copies keep their artwork.",
  restored: "Previous artwork and Visual description restored. No gold spent.",
  heading: "Visuals",
  description: "Visual description",
  descriptionHelp:
    "Describe the construct’s appearance and identity. This is separate from its conversational prompt. At most 4,000 characters; placeholders stay literal.",
  requiredDescription: "Keep a Visual description for this construct’s images.",
  generate: "Generate Images",
  saveAndGenerate: "Save and generate images",
  saveConsequence:
    "Your Visual description changed. Save keeps your edits and requests replacement images from that description only, spending gold when generation is available. Existing images stay until a replacement succeeds.",
  saveWithoutGeneration:
    "Save keeps your edits without generating images or spending generation gold.",
  freshnessUnknown:
    "This earlier artwork has no accessible description-only generation record. Its freshness is unknown; text edits do not require generation.",
  reservationUnknown:
    "Generation reserves gold before it starts. Check the reservation in Visuals before saving.",
  generating: "Generating images…",
  resume: "Resume original request",
  unclaimed:
    "The original request has not started. Resume it using its saved description. This can reserve gold once.",
  retry: "Retry generation",
  check: "Check generation status",
  needsDescription: "Enter a Visual description before generating images.",
  explanation:
    "Generate one image and reuse its framing for the avatar, portrait, opening and working appearance. Save generates replacements only when the Visual description changes. Generate Images uses the current draft Visual description without saving your edits, even if unchanged. Generation spends gold; name and conversational instructions are never sent to the image model. Existing images stay until a replacement succeeds.",
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
      "The Visual description changed or the construct is no longer available. These results were not applied. Your previous images are kept.",
  },
  unknown:
    "The request may still be running. Check its status before starting another request; do not submit again.",
  reservation: (gold: number): string =>
    `Generation reserves ${gold.toLocaleString("en-US")} gold before it starts. Unused gold is returned.`,
  outdated:
    "These images are out of date for the saved Visual description. Generate replacements when you are ready.",
};

export { VISUAL_COPY };
