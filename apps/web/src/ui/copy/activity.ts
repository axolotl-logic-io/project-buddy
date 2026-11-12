const ACTIVITY_COPY = {
  brainstorm: "Brainstorm",
  plan: "Plan",
  chat: "Chat",
  stop: (name: string): string => `Stop ${name}`,
  started: (name: string): string => {
    let bucket = "Plan";
    if (name === "Brainstorm") {
      bucket = "Ideas";
    }
    return `${name} started. Subsequent messages go into ${bucket}. Use stop when you’re finished.`;
  },
  stopped: "Activity stopped. Back to Chat.",
  noQuest: "Open a quest to collect Ideas or Plan steps.",
  ideaSaved: "Saved to Ideas.",
  planSaved: "Saved to Plan.",
  invalid: "Use 1 to 200 characters for each idea or Plan step.",
  full: "The Plan is full. Your message is saved in the conversation; make room before adding this step.",
  failed: "The Activity could not be changed. Try again.",
};

const QUEST_SIDEBAR_COPY = {
  label: "Quest side menu",
  size: "Side menu size",
  minimize: "Minimize",
  medium: "Medium",
  full: "Full screen",
};

export { ACTIVITY_COPY, QUEST_SIDEBAR_COPY };
