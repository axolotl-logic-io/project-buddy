import { redirect } from "next/navigation";
import { HOME_PATH } from "@/routes.ts";

export default function LegacyHome(): never {
  return redirect(HOME_PATH);
}
