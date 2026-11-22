import { expect, type Locator, type Page } from "@playwright/test";
import { given, test, then } from "./support/scenario";

/** The contrast ratio (WCAG 2.2) of a field's placeholder text against the field's background. */
async function placeholderContrast(field: Locator): Promise<number> {
  return field.evaluate((el) => {
    const rgb = (css: string) =>
      css
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const lum = ([r, g, b]: number[]) =>
      [r!, g!, b!]
        .map((c) => c / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
    const fg = lum(rgb(getComputedStyle(el, "::placeholder").color));
    const bg = lum(rgb(getComputedStyle(el).backgroundColor));
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  });
}

const FIELDS: readonly (readonly [string, string, string, string])[] = [
  ["the Visualizer", "/", '.compare label[data-field="yourCrc"] input', "例：0x31C3 または 31 C3"],
  ["the Visualizer", "/", '.compare label[data-field="yourLog"] textarea', "例：0x2672, 0x20B5, 0x9752, …"],
  ["the Check page", "/#check", '.compare-card label[data-field="received"] input', "例：31 32 33 34 35 36 37 38 39 31 C3"],
  ["the Check page", "/#check", '.compare-card label[data-field="yourCheck"] input', "例：0x31C3"],
  ["the Naming page", "/#names", '.compare-card label[data-field="your poly"] input', "例：0x1021"],
  ["the Naming page", "/#names", '.compare-card label[data-field="width"] input', "例：16（空ならすべての幅）"],
  ["the Narrow down page", "/#narrow", '.compare-card label[data-field="your check"] input', "例：0x31C3"],
  ["the Equivalences page", "/#equivalence", '.compare-card label[data-field="your poly"] input', "例：0x1021"],
  ["the Equivalences page", "/#equivalence", '.compare-card label[data-field="your init"] input', "例：0x0000"],
  ["the Table page", "/#table", '.compare-card label[data-field="yourTable"] textarea', "例：0x0000, 0x1021, 0x2042, …"],
  [
    "the Table page over whole bytes",
    "/?width=16&poly=0x1021&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=text&input=123456789#table",
    '.compare-card label[data-field="yourLog"] textarea',
    "例：0x2672, 0x20B5, 0x9752, …",
  ],
  ["the Narrow down page", "/#narrow", '.compare-card label[data-field="width"] input', "例：16（空ならすべての幅）"],
];

test.describe("Example placeholders in the paste fields", () => {
  for (const [page, url, selector, example] of FIELDS) {
    test(`on ${page}, ${selector} shows "${example}" while empty, readable against the field`, async ({
      page: p,
    }: {
      page: Page;
    }) => {
      const field = await given(`${page} is open`, async () => {
        await p.goto(url);
        const field = p.locator(selector);
        await expect(field).toBeVisible();
        return field;
      });
      await then("the empty field shows the example, and its label stays", async () => {
        await expect(field).toHaveValue("");
        await expect(field).toHaveAttribute("placeholder", example);
        await expect(field.locator("xpath=ancestor::label[1]/span[1]")).not.toBeEmpty();
      });
      await then("the example's text has a contrast of at least 4.5:1", async () =>
        expect(await placeholderContrast(field)).toBeGreaterThanOrEqual(4.5),
      );
    });
  }
});
