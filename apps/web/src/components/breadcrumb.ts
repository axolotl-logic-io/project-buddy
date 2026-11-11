import type { Route } from "next";
import type { ReactNode } from "react";

interface Breadcrumb {
  readonly label: string;
  readonly href?: Route;
  readonly action?: ReactNode;
}

export type { Breadcrumb };
