import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { JSX } from "react";
import { SiteFooter } from "@/components/site-footer.tsx";
import { COPY } from "@/ui/copy.ts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: COPY.site.name,
  description: COPY.site.tagline,
};

export default function RootLayout({
  children,
}: LayoutProps<"/">): JSX.Element {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="site-body">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
