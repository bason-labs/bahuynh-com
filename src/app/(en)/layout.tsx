import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/app/meta";
import { fontVariables } from "@/styles/fonts";
import "@/styles/tokens.css";
import "@/styles/globals.css";

export const metadata: Metadata = buildMetadata("en");

export default function EnLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
