import type { Metadata } from "next";
import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";
import { LoginForm } from "./login-form.tsx";

export const metadata: Metadata = {
  title: COPY.login.title,
};

export default function LoginPage(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-semibold text-4xl tracking-tight">
        {COPY.site.name}
      </h1>
      <LoginForm />
    </div>
  );
}
