import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });

async function ruleIds(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => m.ruleId);
}

describe("boundary rules", () => {
  it("bans @/messages in islands", async () => {
    const ids = await ruleIds("src/features/landing/islands/A.tsx", 'import { getMessages } from "@/messages";\nexport const a = getMessages;\n');
    expect(ids).toContain("no-restricted-imports");
  });
  it("bans three outside the mic folder, allows it inside", async () => {
    const code = 'import * as THREE from "three";\nexport const t = THREE;\n';
    expect(await ruleIds("src/features/landing/A.tsx", code)).toContain("no-restricted-imports");
    expect(await ruleIds("src/lib/a.ts", 'import { x } from "three/examples/y";\nexport const t = x;\n')).toContain("no-restricted-imports");
    expect(await ruleIds("src/features/landing/mic/scene.ts", code)).not.toContain("no-restricted-imports");
  });
  it("bans @/features in features and components", async () => {
    const code = 'import { A } from "@/features/other/A";\nexport const a = A;\n';
    expect(await ruleIds("src/features/landing/B.tsx", code)).toContain("no-restricted-imports");
    expect(await ruleIds("src/components/site/B.tsx", code)).toContain("no-restricted-imports");
  });
  it("keeps every pattern in the islands group", async () => {
    const code = 'import { A } from "@/features/other/A";\nexport const a = A;\n';
    expect(await ruleIds("src/features/landing/islands/B.tsx", code)).toContain("no-restricted-imports");
  });
  it("keeps src/lib pure", async () => {
    expect(await ruleIds("src/lib/a.ts", 'import { useState } from "react";\nexport const a = useState;\n')).toContain("no-restricted-imports");
    expect(await ruleIds("src/lib/a.ts", 'import Link from "next/link";\nexport const a = Link;\n')).toContain("no-restricted-imports");
    expect(await ruleIds("src/lib/a.ts", "export const w = window.innerWidth;\n")).toContain("no-restricted-globals");
    expect(await ruleIds("src/lib/a.ts", "export const d = document.title;\n")).toContain("no-restricted-globals");
  });
  it("warns on literal JSX text in features and components", async () => {
    const code = "export const A = () => <p>Hello</p>;\n";
    expect(await ruleIds("src/features/landing/A.tsx", code)).toContain("react/jsx-no-literals");
    expect(await ruleIds("src/components/site/A.tsx", code)).toContain("react/jsx-no-literals");
    const ok = "export const A = () => <p>BS KARA</p>;\n";
    expect(await ruleIds("src/features/landing/A.tsx", ok)).not.toContain("react/jsx-no-literals");
  });
});
