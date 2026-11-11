import type { JSX, ReactNode } from "react";

// A contained page: what it is for and its primary action, above its
// navigation and content. Its heading is the trail band's, in the site
// header.
function PageWorkspace({
  intro,
  action,
  children,
}: {
  readonly intro?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <div className="page-workspace">
      {(intro !== undefined || action !== undefined) && (
        <header className="page-workspace-heading">
          <div className="min-w-0">
            {intro !== undefined && <p className="workspace-intro">{intro}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </div>
  );
}

export { PageWorkspace };
