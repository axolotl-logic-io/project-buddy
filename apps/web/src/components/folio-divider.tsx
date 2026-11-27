import type { JSX } from "react";

// An ornamented rule between the parts of a page's folio.
function FolioDivider(): JSX.Element {
  return (
    <div className="ornamented-divider" aria-hidden="true">
      <span className="ornament" data-ornament="divider" />
    </div>
  );
}

export { FolioDivider };
