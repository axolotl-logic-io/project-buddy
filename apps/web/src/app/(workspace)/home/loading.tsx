import type { JSX } from "react";
import { HOME_COPY } from "@/ui/copy/home.ts";

export default function HomeLoading(): JSX.Element {
  return (
    <>
      <h1 className="page-heading">{HOME_COPY.heading}</h1>
      <p role="status">{HOME_COPY.loading}</p>
    </>
  );
}
