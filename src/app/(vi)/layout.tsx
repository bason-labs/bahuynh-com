import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/styles/fonts";
import "@/styles/tokens.css";
import "@/styles/globals.css";

// Placeholder so every page has a <title> (axe document-title); the head ticket sets the real one.
export const metadata: Metadata = { title: "BS KARA" };

export default function ViLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
