import type { JSX, ReactNode } from "react";

// A contained page with one heading and its primary action above navigation.
function PageWorkspace({
  title,
  intro,
  action,
  children,
}: {
  readonly title: string;
  readonly intro?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="page-workspace">
      <header className="page-workspace-heading">
        <div className="min-w-0">
          <h1 className="page-heading">{title}</h1>
          {intro !== undefined && <p className="workspace-intro">{intro}</p>}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

export { PageWorkspace };
