import type { JSX, ReactNode } from "react";

interface FrameProps {
  readonly children: ReactNode;
}

// Route layouts reserve geometry before their segment's data arrives. They
// also surround empty and error content; no user data belongs in a frame.
function PageFrame({ children }: FrameProps): JSX.Element {
  return <div className="page-column">{children}</div>;
}

function EditorFrame({ children }: FrameProps): JSX.Element {
  return <div className="page-column page-frame-editor">{children}</div>;
}

// A quest's pages, whose conversation and plan sit side by side on a wide
// screen, in every state, so nothing shifts as they load or fail.
function QuestFrame({ children }: FrameProps): JSX.Element {
  return <div className="page-column page-frame-quest">{children}</div>;
}

export { EditorFrame, PageFrame, QuestFrame };
