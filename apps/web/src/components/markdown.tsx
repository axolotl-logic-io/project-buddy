"use client";

import dynamic from "next/dynamic";

// Empty adventures and editable definitions need no Markdown parser. Keep
// server rendering for every visible reply and read-only definition; those
// surfaces preload the renderer through Next's normal dynamic-component path.
const Markdown = dynamic(() =>
  import("@/components/markdown-content.tsx").then((module) => module.Markdown),
);

export { Markdown };
