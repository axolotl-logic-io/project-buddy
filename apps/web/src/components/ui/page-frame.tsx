import type { JSX, ReactNode } from "react";

interface FrameProps {
  readonly children: ReactNode;
}

// Route layouts reserve geometry before their segment's data arrives. They
// also surround empty and error content; no user data belongs in a frame.
function PageFrame({ children }: FrameProps): JSX.Element {
  return <div className="page-column">{children}</div>;
}

function HomeFrame({ children }: FrameProps): JSX.Element {
  return <div className="page-column page-frame-home">{children}</div>;
}

function EditorFrame({ children }: FrameProps): JSX.Element {
  return <div className="page-column page-frame-editor">{children}</div>;
}

export { EditorFrame, HomeFrame, PageFrame };
