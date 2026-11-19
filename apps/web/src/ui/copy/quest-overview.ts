const QUEST_OVERVIEW_COPY = {
  overview: "Overview",
  back: "Back to overview",
  conversation: "Spell conversation",
  sections: "Quest sections",
  spells: "Spells & status",
  spellOptions: "Cast a spell or change status",
  activeSpell: (name: string): string => `${name} active`,
  status: "Quest status",
  personal: "Personal",
  onlyYou: "Just you",
  tasks: (open: number, done: number): string => `${open} open · ${done} done`,
  ideas: (count: number): string => {
    if (count === 1) {
      return "1 idea";
    }
    return `${count} ideas`;
  },
  notes: (count: number): string => {
    if (count === 1) {
      return "1 note";
    }
    return `${count} notes`;
  },
  progressLabel: "Progress",
  progress: (count: number): string => {
    if (count === 1) {
      return "1 milestone";
    }
    return `${count} milestones`;
  },
  people: (count: number): string => `${count} people in this quest`,
  check: "Check off",
  day: "Today",
};

export { QUEST_OVERVIEW_COPY };
