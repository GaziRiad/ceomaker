// Takes the template cards' pictures on the landing and templates pages: the first screen of each
// sample site (/templates/<key>) at 1280 × 800. Run once against a running
// app; the output is committed. Needs Playwright, which isn't a dependency of the app:
//
//   PLAYWRIGHT=/path/to/node_modules/playwright/index.mjs \
//     node scripts/template-shots.mjs http://localhost:3000 [key ...]
//
// With keys, only those templates are taken (a new template: just its key).

const { chromium } = await import(process.env.PLAYWRIGHT ?? "playwright");
const base = process.argv[2] ?? "http://localhost:3000";
const out = new URL("../src/app/(app)/landing/shots/", import.meta.url);
const ALL = ["meridian", "harbour", "monument", "salon", "folio", "tempo"];
const KEYS = process.argv.length > 3 ? process.argv.slice(3) : ALL;
const SIZES = [["desktop", { width: 1280, height: 800 }, 1]];

const browser = await chromium.launch();
for (const key of KEYS) {
  for (const [name, viewport, deviceScaleFactor] of SIZES) {
    // Reduced motion shows every entrance in its final state.
    const page = await browser.newPage({ viewport, deviceScaleFactor, reducedMotion: "reduce" });
    await page.goto(`${base}/templates/${key}`, { waitUntil: "networkidle" });
    // Next's development badge, when run against `next dev`.
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: new URL(`${key}-${name}.png`, out).pathname });
    await page.close();
  }
}
await browser.close();
