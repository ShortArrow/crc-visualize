/**
 * Writes public/og.png, the 1200×630 image shown when the site is shared. It captures the LFSR diagram and the highlighted code line
 * at an XOR step from the dev server given as the first argument (default http://localhost:5173/), and lays them out beside the
 * title, large enough to read at the size of a link card. Run again when the screen changes.
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:5173/";
const QUERY = "?width=4&poly=0x3&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=bits&input=110101&lang=en&code=c";
const MAX_STEPS = 60;

const browser = await chromium.launch({ channel: "chrome" });
const app = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await app.goto(new URL(QUERY, BASE).href);
await app.locator("svg.lfsr").waitFor();
for (let i = 0; i < MAX_STEPS && !(await app.locator(".code-line.active", { hasText: "^=" }).count()); i++)
  await app.keyboard.press("ArrowRight");
await app.waitForTimeout(2500);
const drawn = await app.locator("svg.lfsr").evaluate((svg) => {
  const boxes = [...svg.querySelectorAll("*")].map((e) => e.getBoundingClientRect()).filter((b) => b.width || b.height);
  const [left, top] = [Math.min(...boxes.map((b) => b.left)), Math.min(...boxes.map((b) => b.top))];
  return {
    x: left - 8,
    y: top - 8,
    width: Math.max(...boxes.map((b) => b.right)) - left + 16,
    height: Math.max(...boxes.map((b) => b.bottom)) - top + 16,
  };
});
const diagram = (await app.screenshot({ clip: drawn })).toString("base64");
await app.locator(".code-line.active .code-text").evaluate((text) => {
  const first = document.createTreeWalker(text, NodeFilter.SHOW_TEXT).nextNode();
  if (first) first.textContent = first.textContent.trimStart();
});
const written = await app.locator(".code-line.active").evaluate((row) => {
  const [r, t] = [row.getBoundingClientRect(), row.querySelector(".code-text").getBoundingClientRect()];
  return { x: r.left, y: r.top, width: t.right - r.left + 16, height: r.height };
});
const line = (await app.screenshot({ clip: written })).toString("base64");

const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.setContent(`<!doctype html>
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #1e1f22; color: #e6e6e6;
    font-family: "Segoe UI", system-ui, sans-serif; display: grid; grid-template-columns: 430px minmax(0, 1fr); }
  .text { padding: 64px 0 48px 64px; display: flex; flex-direction: column; }
  h1 { margin: 0; font-size: 64px; line-height: 1.05; font-weight: 700; letter-spacing: -1px; }
  p { margin: 28px 0 0; font-size: 36px; line-height: 1.35; color: #b9c0cc; }
  .url { margin-top: auto; font-size: 32px; color: #4fc1ff; }
  .figure { display: flex; flex-direction: column; justify-content: center; gap: 36px; padding: 48px 64px 48px 24px; }
  .diagram { width: 100%; min-width: 0; }
  .line { align-self: flex-start; height: 64px; border-radius: 8px; }
</style>
<div class="text"><h1>CRC<br>Visualizer</h1><p>One clock of the LFSR circuit, one line of code, in step.</p><div class="url">crc.shortarrow.jp</div></div>
<div class="figure"><img class="diagram" src="data:image/png;base64,${diagram}"><img class="line" src="data:image/png;base64,${line}"></div>`);
await card.screenshot({ path: "public/og.png" });
await browser.close();
