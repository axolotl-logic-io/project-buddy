// The quest the user has just left, kept in this page's memory until
// Quests opens and names it once. Leaving opens Quests, where the quest is
// no longer listed, so without this nothing would say that it worked.

let leftQuest: string | undefined;

// Records the name of the quest the user left.
function noteLeftQuest(name: string): void {
  leftQuest = name;
}

// The name of the quest the user left, if Quests hasn't named it yet; it
// is named once.
function takeLeftQuest(): string | undefined {
  const name = leftQuest;
  leftQuest = undefined;
  return name;
}

export { noteLeftQuest, takeLeftQuest };
