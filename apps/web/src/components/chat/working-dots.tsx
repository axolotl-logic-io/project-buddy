import type { JSX } from "react";

// Three dots that pulse in turn while the buddy works, in the text colour
// around them; still when the user asks for reduced motion (chat.css).
// Decoration only: the text beside them, or the reply as it arrives, says
// what is happening.
function WorkingDots(): JSX.Element {
  return (
    <span aria-hidden="true" className="working-dots inline-flex gap-1">
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  );
}

export { WorkingDots };
