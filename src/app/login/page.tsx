import type { Metadata } from "next";
import type { JSX } from "react";
import { COPY } from "@/ui/copy.ts";
import { LoginForm } from "./login-form.tsx";

export const metadata: Metadata = {
  title: COPY.login.title,
};

export default function LoginPage(): JSX.Element {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
      <div className="panel flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="site-title">{COPY.site.name}</h1>
          <p className="text-muted">{COPY.login.intro}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
