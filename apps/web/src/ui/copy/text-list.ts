const TEXT_LIST_COPY = {
  entry: "Reply",
  add: "Add reply",
  save: "Save reply",
  cancel: "Cancel reply",
  edit: "Edit reply",
  remove: "Remove reply",
  actions: (text: string): string => `Actions for “${text}”`,
  invalid: (max: number): string =>
    `Use 1 to ${max} characters for each reply.`,
};

export { TEXT_LIST_COPY };
