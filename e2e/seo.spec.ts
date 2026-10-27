import { expect, test } from "./support";

const O = "https://bahuynh.com";
const shared = { "og:type": "website", "og:site_name": "BS Kara", "og:image:width": "1200", "og:image:height": "630", "twitter:card": "summary_large_image" };
const pages = {
  "/": {
    canonical: `${O}/`,
    title: "BS Kara — Đêm nay hát gì?",
    description: "Karaoke cho cả nhóm. TV là sân khấu, điện thoại là micro và điều khiển, MC AI dẫn từng bài. Mở phòng trong mười giây, không cần cài đặt.",
    url: `${O}/`,
    locale: "vi_VN",
    alt: 'Micro chrome dưới đèn sân khấu, chữ BS KARA phía sau và dòng "Karaoke cho cả nhóm."',
    image: `${O}/og/vi.png`,
    alternate: "en_US",
  },
  "/en/": {
    canonical: `${O}/en/`,
    title: "BS Kara — What are we singing tonight?",
    description: "Karaoke for the whole group. The TV is the stage, phones are the mic and the remote, and an AI host introduces every song. A room is open in ten seconds, nothing to install.",
    url: `${O}/en/`,
    locale: "en_US",
    alt: 'A chrome microphone under a stage light, BS KARA behind it and the line "Karaoke for the whole group."',
    image: `${O}/og/en.png`,
    alternate: "vi_VN",
  },
} as const;

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
const attrs = (tag: string) => Object.fromEntries([...tag.matchAll(/\s([\w:-]+)="([^"]*)"/g)].map((m) => [m[1].toLowerCase(), decode(m[2])]));

for (const [path, want] of Object.entries(pages)) {
  test.describe(`head of ${path}`, () => {
    let head = "";
    test.beforeAll(async ({ playwright, baseURL }) => {
      const ctx = await playwright.request.newContext({ baseURL });
      const html = await (await ctx.get(path)).text();
      head = html.slice(html.indexOf("<head"), html.indexOf("</head>"));
      await ctx.dispose();
    });
    const links = () => [...head.matchAll(/<link\b[^>]*>/g)].map((m) => attrs(m[0]));
    const metas = (key: "name" | "property", value: string) =>
      [...head.matchAll(/<meta\b[^>]*>/g)].map((m) => attrs(m[0])).filter((a) => a[key] === value);

    test("canonical and the three alternates appear once each", () => {
      const count = (rel: string, hreflang?: string) =>
        links().filter((l) => l.rel === rel && l.hreflang === hreflang).map((l) => l.href);
      expect(count("canonical")).toEqual([want.canonical]);
      expect(count("alternate", "vi")).toEqual([`${O}/`]);
      expect(count("alternate", "en")).toEqual([`${O}/en/`]);
      expect(count("alternate", "x-default")).toEqual([`${O}/`]);
    });

    test("title, description and share tags carry the specified values once", () => {
      expect([...head.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]))).toEqual([want.title]);
      const once = (key: "name" | "property", value: string, content: string | string[]) =>
        expect(metas(key, value).map((a) => a.content), value).toEqual(Array.isArray(content) ? content : [content]);
      once("name", "description", want.description);
      once("property", "og:title", want.title);
      once("property", "og:description", want.description);
      once("property", "og:url", want.url);
      once("property", "og:locale", want.locale);
      once("property", "og:locale:alternate", want.alternate);
      once("property", "og:image", want.image);
      once("property", "og:image:alt", want.alt);
      once("name", "twitter:title", want.title);
      once("name", "twitter:description", want.description);
      once("name", "twitter:image:alt", want.alt);
      for (const [k, v] of Object.entries(shared)) once(k.startsWith("twitter") ? "name" : "property", k, v);
    });
  });
}

for (const lang of ["vi", "en"]) {
  test(`/og/${lang}.png is a 1200x630 PNG`, async ({ request }) => {
    const res = await request.get(`/og/${lang}.png`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    const bytes = await res.body();
    expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
  });
}
