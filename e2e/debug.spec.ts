import { expect } from "@playwright/test";
import { given, patience, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

/** CRC-3/TUTORIAL fed 2 bytes, AB F0, playing fast at a steady speed. */
const TWO_BYTES = "?width=3&poly=0x3&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=hex&input=ABF0&speed=steady&rate=8";
const PAUSED = "再生";
/** The line XORing poly into crc, in any code language. */
const XOR_LINE = /\^=\s*poly/;

test.describe("Sidebar sections", () => {
  test("the sidebar has Settings, Variables and Breakpoints sections, which open and close and stay so after a reload", async ({
    page,
  }) => {
    const v = await given("the page is open with the default settings", () => Visualizer.open(page));
    await then("the three sections are shown open, in order", async () => {
      await expect(page.locator(".sidebar-section > h2")).toHaveText(["設定", "変数", "ブレークポイント"]);
      await expect(v.debug.variable("crc")).toBeVisible();
    });
    await when("pressing the Variables heading", () => v.debug.sectionHeading("variables").click());
    await then("the Variables section closes", () => expect(v.debug.variable("crc")).toBeHidden());
    await when("reloading", () => page.reload());
    await then("the Variables section stays closed, and the others stay open", async () => {
      await expect(v.debug.variable("crc")).toBeHidden();
      await expect(v.settings.preset()).toBeVisible();
    });
  });
});

test.describe("Variables", () => {
  test("the variables show their values at the step shown, and mark the ones that changed", async ({ page }) => {
    const v = await given("the page is open with the default settings (5 input bits)", () => Visualizer.open(page));
    await then("at the start, crc holds init, nothing has been read and bit has no value", async () => {
      await expect(v.debug.value("crc")).toHaveText("0b000 0x0");
      await expect(v.debug.value("bitsRead")).toHaveText("0 / 5");
      await expect(v.debug.value("bit")).toHaveText("—");
    });
    await when("advancing to the 1st xor", () => v.goTo("xor"));
    await then("crc and the XOR count have changed and are marked, and bit is not", async () => {
      await expect(v.debug.value("crc")).toHaveText("0b011 0x3");
      await expect(v.debug.value("xorCount")).toHaveText("1");
      await expect(v.debug.variable("crc")).toHaveClass(/\bchanged\b/);
      await expect(v.debug.variable("xorCount")).toHaveClass(/\bchanged\b/);
      await expect(v.debug.value("bit")).toHaveText("1");
      await expect(v.debug.variable("bit")).not.toHaveClass(/\bchanged\b/);
    });
    await then("the input is not whole bytes, so there is no byte variable", () =>
      expect(v.debug.variable("byte")).toHaveCount(0),
    );
  });
});

test.describe("Breakpoints", () => {
  test("a breakpoint on the XOR line with hit count 2 stops playback at the 2nd XOR", async ({ page }) => {
    const v = await given("2 bytes are open", () => Visualizer.open(page, TWO_BYTES));
    await when("pressing left of the line number of the XOR line", () => v.debug.gutter(XOR_LINE).click());
    await then("the line has a breakpoint, and it is listed", async () => {
      await expect(v.debug.gutter(XOR_LINE)).toHaveClass(/\bbp-set\b/);
      await expect(v.debug.entries()).toHaveCount(1);
      await expect(v.debug.entry("xor")).toContainText("多項式と XOR");
    });
    await when("setting its hit count to 2 and playing", async () => {
      await v.debug.hitCount("xor").fill("2");
      await v.settings.play().click();
    });
    await then("playback pauses at the 2nd XOR", async () => {
      await expect(v.settings.play()).toHaveAttribute("aria-label", PAUSED);
      await expect(v.debug.value("xorCount")).toHaveText("2");
      expect(await v.stepKind()).toBe("xor");
      await expect(v.debug.hits("xor")).toContainText("2");
    });
    await then("the breakpoint is in the URL", async () => expect(v.settings.query().get("bp")).toBe("xor@2"));
  });

  test("a bit breakpoint stops playback once that bit has been read, and pressing the bit again removes it", async ({ page }) => {
    const v = await given("2 bytes are open", () => Visualizer.open(page, TWO_BYTES));
    await when("pressing bit 2 of the input stream", () => v.debug.bit(2).click());
    await then("bit 2 has a mark, and is listed with its value, and byte 0 has none", async () => {
      await expect(v.debug.bitMark(2)).toBeVisible();
      await expect(v.debug.entry("bit2")).toContainText("bit 2（1）");
      await expect(v.debug.byteMark(0)).toHaveCount(0);
    });
    await when("playing", () => v.settings.play().click());
    await then("playback pauses with 3 bits read", async () => {
      await expect(v.settings.play()).toHaveAttribute("aria-label", PAUSED);
      await expect(v.debug.value("bitsRead")).toHaveText("3 / 16");
    });
    await when("pressing bit 2 again", () => v.debug.bit(2).click());
    await then("the breakpoint is gone", async () => {
      await expect(v.debug.bitMark(2)).toHaveCount(0);
      await expect(v.debug.entries()).toHaveCount(0);
    });
  });

  test("a bit breakpoint can be set on an input that is not whole bytes", async ({ page }) => {
    const v = await given("5 bits are open", () =>
      Visualizer.open(
        page,
        "?width=3&poly=0x3&init=0x0&refin=0&refout=0&xorout=0x0&inputMode=bits&input=10101&speed=steady&rate=8",
      ),
    );
    await when("pressing bit 4 of the input stream", () => v.debug.bit(4).click());
    await then("bit 4 has a mark, and there is no byte to press", async () => {
      await expect(v.debug.bitMark(4)).toBeVisible();
      await expect(v.debug.byte(0)).toHaveCount(0);
    });
  });

  test("with refin, a bit's mark is above the value fed at its position, and moves with it when the byte is reflected", async ({
    page,
  }) => {
    const v = await given("an 8-bit CRC with refin is open with a breakpoint on bit 0, before byte 0 is reflected", () =>
      Visualizer.open(page, "?width=8&poly=0x07&init=0x0&refin=1&refout=0&xorout=0x0&inputMode=hex&input=01&bp=bit0"),
    );
    await then("the mark of bit 0 is above the last value of byte 0, which is fed first", () =>
      expect.poll(() => v.debug.bitMarkPosition(0)).toBe(7),
    );
    await when("stepping forward to reflect byte 0", () => page.keyboard.press("ArrowRight"));
    await then("the mark of bit 0 is above the first value", () => expect.poll(() => v.debug.bitMarkPosition(0)).toBe(0));
    await when("pressing the first value of the input stream", () => v.debug.bit(0).click());
    await then("the breakpoint on bit 0 is removed", () => expect(v.debug.bitMark(0)).toHaveCount(0));
  });

  test("with refin, pressing a value of a byte not yet reflected sets the breakpoint on the bit at which it is fed", async ({
    page,
  }) => {
    const v = await given("an 8-bit CRC with refin is open, before byte 0 is reflected", () =>
      Visualizer.open(page, "?width=8&poly=0x07&init=0x0&refin=1&refout=0&xorout=0x0&inputMode=hex&input=01"),
    );
    await when("pressing the first value of the input stream", () => v.debug.bitAt(0).click());
    await then("bit 7 has the breakpoint, with its mark above that value", async () => {
      await expect(v.debug.entry("bit7")).toBeVisible();
      await expect.poll(() => v.debug.bitMarkPosition(7)).toBe(0);
    });
  });

  test("a byte breakpoint stops playback once the byte has been read, and playing again goes on to the end", async ({ page }) => {
    const v = await given("2 bytes are open", () => Visualizer.open(page, TWO_BYTES));
    await when("pressing byte 0 of the input stream", () => v.debug.byte(0).click());
    await then("byte 0 has a mark, and is listed with its value", async () => {
      await expect(v.debug.byteMark(0)).toBeVisible();
      await expect(v.debug.entry("byte0")).toContainText("0xAB");
    });
    await when("playing", () => v.settings.play().click());
    await then("playback pauses with the 8 bits of byte 0 read", async () => {
      await expect(v.settings.play()).toHaveAttribute("aria-label", PAUSED);
      await expect(v.debug.value("bitsRead")).toHaveText("8 / 16");
    });
    await when("playing again", () => v.settings.play().click());
    await then("playback goes on to the end", () => expect(v.counter).toHaveText(/^(\d+) \/ \1$/, patience(10_000)));
  });

  test("breakpoints from the URL are restored, a disabled one does not stop playback, and removing all clears them", async ({
    page,
  }) => {
    const v = await given("2 bytes are open with a disabled XOR breakpoint and a breakpoint on byte 0 in the URL", () =>
      Visualizer.open(page, `${TWO_BYTES}&bp=!xor,byte0`),
    );
    await then("both are listed, and the XOR one is disabled", async () => {
      await expect(v.debug.entries()).toHaveCount(2);
      await expect(v.debug.enabled("xor")).not.toBeChecked();
      await expect(v.debug.gutter(XOR_LINE)).toHaveClass(/\bbp-off\b/);
    });
    await when("playing", () => v.settings.play().click());
    await then("playback does not stop at the XORs, and pauses after byte 0", async () => {
      await expect(v.settings.play()).toHaveAttribute("aria-label", PAUSED);
      await expect(v.debug.value("bitsRead")).toHaveText("8 / 16");
    });
    await when("removing all breakpoints", () => v.debug.removeAll().click());
    await then("the list, the marks and the URL parameter are empty", async () => {
      await expect(v.debug.entries()).toHaveCount(0);
      await expect(v.debug.byteMark(0)).toHaveCount(0);
      await expect(v.debug.gutter(XOR_LINE)).not.toHaveClass(/\bbp-(set|off)\b/);
      expect(v.settings.query().get("bp")).toBe("");
    });
  });

  test("a line breakpoint stays on the line doing the same work when the code language changes", async ({ page }) => {
    const v = await given("a breakpoint is set on the XOR line of the pseudocode", async () => {
      const v = await Visualizer.open(page);
      await v.debug.gutter(XOR_LINE).click();
      return v;
    });
    await when("writing the code in C", () => v.code.langSelect().selectOption("c"));
    await then("the XOR line of the C code has the breakpoint", () => expect(v.debug.gutter(XOR_LINE)).toHaveClass(/\bbp-set\b/));
  });

  test("stepping forward does not stop at breakpoints", async ({ page }) => {
    const v = await given("a breakpoint is set on the feedback line", async () => {
      const v = await Visualizer.open(page, `${TWO_BYTES}&bp=feedback`);
      return v;
    });
    await when("pressing → twice from the start", () => v.stepForward(2));
    await then("it is at the 3rd step, past the 1st feedback", () => expect(v.counter).toHaveText(/^3 \//));
  });
});

test.describe("Variables and breakpoints on a phone", () => {
  test("the variables sit between the code and the log, and the breakpoints are in the drawer", async ({ page }) => {
    const v = await given("the page is open on a 390×844 screen", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      return Visualizer.open(page, TWO_BYTES);
    });
    await then("the variables come below the code and above the log", async () => {
      const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
      const [code, vars, log] = [await box(".software"), await box(".variables"), await box(".log-pane")];
      expect(vars.y).toBeGreaterThanOrEqual(code.y + code.height - 1);
      expect(log.y).toBeGreaterThanOrEqual(vars.y + vars.height - 1);
    });
    await then("the place to press left of a line number is wide enough for a finger", async () => {
      expect((await v.debug.gutter(XOR_LINE).boundingBox())!.width).toBeGreaterThanOrEqual(24);
    });
    await when("opening the drawer", () => v.workbench.sidebarToggle().click());
    await then("it has the Settings and Breakpoints sections, without Variables", async () => {
      await expect(page.locator(".sidebar .sidebar-section > h2")).toHaveText(["設定", "ブレークポイント"]);
    });
  });
});
