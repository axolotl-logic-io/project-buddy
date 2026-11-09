import type { Route } from "next";

interface Breadcrumb {
  readonly label: string;
  readonly href?: Route;
}

export type { Breadcrumb };
