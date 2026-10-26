import Link from "next/link";
import { fontVariables } from "@/styles/fonts";
import "@/styles/tokens.css";
import "@/styles/globals.css";

export default function GlobalNotFound() {
  return (
    <html lang="vi" className={fontVariables}>
      <body>
        <main>
          <h1>404</h1>
          <p>
            <Link href="/">Về trang chủ</Link> · <Link href="/en/">Back to home</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
