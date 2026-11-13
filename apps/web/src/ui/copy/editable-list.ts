const EDITABLE_LIST_COPY = {
  reorder: (text: string): string => `Reorder “${text}”`,
  dragHint: "Drag to reorder, or use the up and down arrow keys",
  reordered: "List order saved.",
  failed: "The order couldn’t be saved. Try again.",
};

export { EDITABLE_LIST_COPY };
