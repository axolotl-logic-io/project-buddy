const IDEAS_COPY = {
  heading: "Ideas",
  summary: (count: number): string => `${count} saved · Uncommitted`,
  possibility: "Possibility",
  intro:
    "Keep possibilities here until you’re ready to make them part of the Tasks.",
  empty: "No ideas yet. Add something you might want to try.",
  label: "Idea",
  add: "Add idea",
  save: "Save idea",
  edit: "Edit idea",
  actions: (text: string): string => `Actions for “${text}”`,
  cancel: "Cancel idea edit",
  remove: "Remove idea",
  move: "Move to Tasks",
  invalid: "Enter an idea of 1 to 200 characters.",
  notFound: "This quest or idea is no longer available.",
  tasksFull:
    "The idea couldn’t be moved. Make room in the Tasks, then try again.",
} as const;

export { IDEAS_COPY };
