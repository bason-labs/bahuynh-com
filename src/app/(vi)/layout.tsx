import type { ReactNode } from "react";
import { fontVariables } from "@/styles/fonts";
import "@/styles/tokens.css";
import "@/styles/globals.css";

export default function ViLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
