import type { JSX } from "react";
import { SiteMenu } from "@/components/site-menu.tsx";

export default function NoHeaderLinks(): JSX.Element {
  return <SiteMenu links={null} />;
}
