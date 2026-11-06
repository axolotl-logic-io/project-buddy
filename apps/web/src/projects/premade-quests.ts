// Starting points only: saved quests retain no connection to this catalog.
interface PremadeQuest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly activityId: string;
  readonly journal: string;
}

const PREMADE_QUESTS: readonly PremadeQuest[] = [
  {
    id: "start-without-inspiration",
    name: "Start without inspiration",
    description:
      "Discover something you want to make, at a size that feels possible.",
    activityId: "find-something-to-make",
    journal: `## Goal
Discover and make something that feels like my own. The medium, tools and subject are still open.

## Possible milestones (planned)
- Find an idea I want to try.
- Make a small first version.
- Refine it and decide when it feels finished.

## Next step
Explore my interests, available materials and energy with my construct.`,
  },
  {
    id: "design-an-original-character",
    name: "Design an original character",
    description:
      "Explore who they are and bring them to life in your chosen medium.",
    activityId: "brainstorming",
    journal: `## Goal
Develop a character I want to bring to life. The medium, tools and level of detail are open.

## Possible milestones (planned)
- Explore a personality, appearance or small detail.
- Make a first version in a medium I choose.
- Refine the character and decide what feels complete.

## Next step
Explore a character idea and a scope that fits my experience and energy.`,
  },
  {
    id: "make-a-tiny-game",
    name: "Make a tiny game",
    description:
      "Find one playful idea and turn it into something you can play.",
    activityId: "project-breakdown",
    journal: `## Goal
Make a small playable game. The format, tools and kind of play are open.

## Possible milestones (planned)
- Choose one playful idea and a manageable scope.
- Make a first playable version.
- Try it, refine it and decide when it is finished.

## Next step
Explore what I enjoy playing and choose a small first experiment that fits my experience.`,
  },
  {
    id: "write-a-short-story",
    name: "Write a short story",
    description:
      "Find a story you want to tell and take it through a finished draft.",
    activityId: "brainstorming",
    journal: `## Goal
Write a short story I want to tell. The genre, tools, length and starting idea are open.

## Possible milestones (planned)
- Find a character, place or event to explore.
- Make a first draft at a manageable length.
- Revise it and decide when it feels finished.

## Next step
Explore a story seed and a way to begin that fits my experience and energy.`,
  },
];

export type { PremadeQuest };
export { PREMADE_QUESTS };
