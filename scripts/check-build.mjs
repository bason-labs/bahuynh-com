import { existsSync, readFileSync } from "node:fs";

const pages = [
  { file: "out/index.html", lang: "vi", h1: "Karaoke cho cả nhóm." },
  { file: "out/en/index.html", lang: "en", h1: "Karaoke for the whole group." },
];
const errors = [];

for (const { file, lang, h1 } of pages) {
  if (!existsSync(file)) {
    errors.push(`${file} is missing`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  if (!html.includes(`<html lang="${lang}"`)) errors.push(`${file} lacks <html lang="${lang}"`);
  if (!html.includes(h1)) errors.push(`${file} lacks the h1 "${h1}"`);
}

if (!existsSync("out/404.html")) {
  errors.push("out/404.html is missing");
} else {
  const html = readFileSync("out/404.html", "utf8");
  for (const href of ["/", "/en/"]) {
    if (!html.includes(`href="${href}"`)) errors.push(`out/404.html lacks a link to ${href}`);
  }
}

if (errors.length > 0) {
  for (const e of errors) console.error(`check-build: ${e}`);
  process.exit(1);
}
console.log("check-build: ok");
