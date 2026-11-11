import { redirect } from "next/navigation";
import { HOME_PATH } from "@/routes.ts";

// Root navigation shares the sign-in destination.
export default function Root(): never {
  return redirect(HOME_PATH);
}
