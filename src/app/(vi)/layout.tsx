import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/app/meta";
import { fontVariables } from "@/styles/fonts";
import "@/styles/tokens.css";
import "@/styles/globals.css";

export const metadata: Metadata = buildMetadata("vi");

export default function ViLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
