const QUEST_OVERVIEW_COPY = {
  heading: "Overview",
  back: "Back to overview",
  sections: "Quest sections",
  spellsAndStatus: "Spells & status",
  progress: "Progress",
  openTasks: (count: number): string => `${count} open`,
  saved: (count: number): string => `${count} saved`,
  milestones: (count: number): string => `${count} recorded`,
  people: (count: number): string => `${count} in quest`,
  noSpell: "No active spell",
  conversation: "Spell conversation",
};

export { QUEST_OVERVIEW_COPY };
