// Historical rich content exercises the renderer independently of the local command engine.

function markdownReplyText(): string {
  return [
    "## Beveling an edge",
    "A bevel *rounds* a hard edge.",
    "1. Select the edge.\n2. Press **Ctrl+B** and move the mouse.",
    "- Scroll to add segments.\n- Click to confirm.",
    "| Key | Action |\n| --- | --- |\n| Ctrl+B | Bevel |",
    "Read more in [the manual](https://docs.blender.org/manual/en/latest/modeling/meshes/editing/edge/bevel.html#bevel).",
    "```python\nimport bpy\nbpy.ops.mesh.bevel(offset=0.1)\n```",
  ].join("\n\n");
}

export { markdownReplyText };
