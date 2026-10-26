import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const threeBan = {
  group: ["three", "three/*"],
  message: "three is imported only in src/features/landing/mic/** (AD-4).",
};
const featuresBan = {
  group: ["@/features/*", "@/features/**"],
  message: "Features and shared components never import features (AD-9).",
};
const messagesBan = {
  group: ["@/messages", "@/messages/*"],
  message: "Islands get strings as props and never import messages (AD-3).",
};
const digits = Array.from({ length: 10 }, (_, i) => String(i));
const libBanned = ["react", "react-dom", "next", "three"];
const libPatterns = [
  { group: ["react/*", "react-dom/*", "next/*", "three/*"], message: "src/lib is pure (AD-10)." },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["out/**", "out-film/**", ".next/**", "node_modules/**", "next-env.d.ts"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [threeBan] }] },
  },
  {
    files: ["src/features/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [threeBan, featuresBan] }] },
  },
  {
    files: ["src/features/landing/mic/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [featuresBan] }] },
  },
  {
    files: ["src/**/islands/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [threeBan, featuresBan, messagesBan] }],
    },
  },
  {
    files: ["src/lib/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: libBanned.map((name) => ({ name, message: "src/lib is pure (AD-10)." })), patterns: libPatterns },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: "src/lib is pure (AD-10)." },
        { name: "document", message: "src/lib is pure (AD-10)." },
      ],
    },
  },
  {
    files: ["src/features/**/*.tsx", "src/components/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": [
        "warn",
        { noStrings: true, allowedStrings: ["BS KARA", "■", "●", "▶", "·", ...digits], ignoreProps: true },
      ],
    },
  },
]);
