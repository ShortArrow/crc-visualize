/**
 * Writes public/og.png, the 1200×630 image shown when the site is shared. It captures the visualizer from the dev server given as
 * the first argument (default http://localhost:5173/) and lays the capture under the title. Run again when the screen changes.
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:5173/";
const QUERY = "?width=8&poly=0x07&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=text&input=A&lang=en";
const STEPS = 9;

const browser = await chromium.launch({ channel: "chrome" });
const app = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await app.goto(new URL(QUERY, BASE).href);
await app.locator("svg.lfsr").waitFor();
await app.keyboard.press("Control+b");
for (let i = 0; i < STEPS; i++) await app.keyboard.press("ArrowRight");
await app.waitForTimeout(1500);
const shot = (await app.screenshot()).toString("base64");

const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.setContent(`<!doctype html>
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #1e1f22; color: #e6e6e6;
    font-family: "Segoe UI", system-ui, sans-serif; }
  header { display: flex; align-items: baseline; gap: 24px; padding: 34px 48px 26px; }
  h1 { margin: 0; font-size: 56px; font-weight: 700; letter-spacing: -0.5px; }
  p { margin: 0; font-size: 26px; color: #9da5b4; }
  .url { margin-left: auto; color: #4fc1ff; }
  img { display: block; width: 1104px; margin: 0 48px; border: 1px solid #3a3d44; border-radius: 10px; }
</style>
<header><h1>CRC Visualizer</h1><p>LFSR ⇄ code, one clock at a time</p><p class="url">crc.shortarrow.jp</p></header>
<img src="data:image/png;base64,${shot}">`);
await card.screenshot({ path: "public/og.png" });
await browser.close();
