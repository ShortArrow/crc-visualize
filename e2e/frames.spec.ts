import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

/** CRC-16/IBM-SDLC, the CRC-16-CCITT polynomial sent right-shifted with init and xorout 0xFFFF, at a steady speed. */
const X25 = "?width=16&poly=0x1021&init=0xFFFF&refin=1&refout=1&xorout=0xFFFF&inputMode=hex&speed=steady&rate=8";
/** A header byte FE, the bytes of 123456789, and their CRC 0x906E low byte first; the 2nd frame has its last data byte changed. */
const GOOD = "FE 31 32 33 34 35 36 37 38 39 6E 90";
const BAD = "FE 31 32 33 34 35 36 37 38 30 6E 90";
const TWO_FRAMES = `${X25}&input=${encodeURIComponent(`${GOOD}\n${BAD}`)}&from=1&crcField=le`;

test.describe("Frames", () => {
  test("each line of hex input is a frame, checked against its CRC field, and the range shows on its bytes", async ({ page }) => {
    const v = await given("2 frames are open, computed from byte 1 with an LE CRC field", () =>
      Visualizer.open(page, TWO_FRAMES),
    );
    await then("both frames are listed, and the 1st matches its field and the 2nd does not", async () => {
      await expect(v.frames.rows()).toHaveCount(2);
      await expect(v.frames.crc(0)).toHaveText("0x906E");
      await expect(v.frames.field(0)).toHaveText("0x906E");
      await expect(v.frames.verdict(0)).toHaveAttribute("data-ok", "true");
      await expect(v.frames.field(1)).toHaveText("0x906E");
      await expect(v.frames.verdict(1)).toHaveAttribute("data-ok", "false");
    });
    await then("each verdict says which two values it compares", async () => {
      await expect(v.frames.verdict(0)).toHaveAttribute("title", "計算した CRC が入力中の CRC と同じ");
      await expect(v.frames.verdict(1)).toHaveAttribute("title", "計算した CRC が入力中の CRC と違う");
    });
    await then("byte 0 is outside the range, bytes 1 to 9 are in it, and bytes 10 and 11 are the CRC field", async () => {
      await expect(v.frames.byte(0, 0)).not.toHaveClass(/\bin-range\b|\bcrc-field\b/);
      await expect(v.frames.byte(0, 1)).toHaveClass(/\bin-range\b/);
      await expect(v.frames.byte(0, 9)).toHaveClass(/\bin-range\b/);
      await expect(v.frames.byte(0, 10)).toHaveClass(/\bcrc-field\b/);
      await expect(v.frames.byte(0, 11)).toHaveClass(/\bcrc-field\b/);
    });
    await then("the 1st frame's 9 bytes are visualized", async () => {
      await expect(v.frames.row(0)).toHaveClass(/\bselected\b/);
      await expect(v.debug.value("bitsRead")).toHaveText("0 / 72");
    });
  });

  test("a checkbox says whether the input holds a CRC, and while checked its byte order and which bytes are read are shown", async ({
    page,
  }) => {
    const v = await given("2 frames holding an LE CRC after bytes 1 to 9 are open", () => Visualizer.open(page, TWO_FRAMES));
    await then("the box is checked, low byte first is chosen, and bytes 10 to 11 are said to be read as the CRC", async () => {
      await expect(v.frames.crcInInput()).toBeChecked();
      await expect(v.frames.order("le")).toBeChecked();
      await expect(v.frames.crcNote()).toHaveText("10〜11 バイト目を CRC として読み、計算した CRC と比べる");
      await expect(v.frames.row(0)).toContainText("in input 0x906E");
    });
    await when("unchecking the box", () => v.frames.crcInInput().uncheck());
    await then("the order and the note are gone, no frame is compared, and the URL says none", async () => {
      await expect(v.frames.order("le")).toHaveCount(0);
      await expect(v.frames.crcNote()).toHaveCount(0);
      await expect(v.frames.verdict(0)).toHaveCount(0);
      expect(v.settings.query().get("crcField")).toBe("none");
    });
    await when("checking it again", () => v.frames.crcInInput().check());
    await then("low byte first comes back and the frames are compared again", async () => {
      await expect(v.frames.order("le")).toBeChecked();
      await expect(v.frames.verdict(0)).toHaveAttribute("data-ok", "true");
    });
    await when("choosing high byte first", () => v.frames.order("be").check());
    await then("the CRC is read the other way round, so the 1st frame no longer agrees", async () => {
      await expect(v.frames.field(0)).toHaveText("0x6E90");
      await expect(v.frames.verdict(0)).toHaveAttribute("data-ok", "false");
      expect(v.settings.query().get("crcField")).toBe("be");
    });
  });

  test("picking a frame visualizes it and puts it in the URL", async ({ page }) => {
    const v = await given("2 frames are open", () => Visualizer.open(page, TWO_FRAMES));
    await when("picking the 2nd frame", () => v.frames.pick(1).click());
    await then("the 2nd frame is selected and visualized to its CRC", async () => {
      await expect(v.frames.row(1)).toHaveClass(/\bselected\b/);
      await v.settings.play().focus();
      await page.keyboard.press("End");
      await expect(v.debug.value("crc")).not.toContainText("0x906E");
      expect(v.settings.query().get("frame")).toBe("1");
    });
  });

  test("dragging across the bytes of a frame sets the range, and the CRC field follows it", async ({ page }) => {
    const v = await given("2 frames are open", () => Visualizer.open(page, TWO_FRAMES));
    await when("dragging from byte 2 to byte 4 of the 1st frame", () => v.frames.drag(0, 2, 4));
    await then("the range is bytes 2 to 4, and the CRC field is bytes 5 and 6", async () => {
      await expect(v.frames.from()).toHaveValue("2");
      await expect(v.frames.to()).toHaveValue("4");
      await expect(v.frames.byte(0, 1)).not.toHaveClass(/\bin-range\b/);
      await expect(v.frames.byte(0, 4)).toHaveClass(/\bin-range\b/);
      await expect(v.frames.byte(0, 5)).toHaveClass(/\bcrc-field\b/);
      await expect(v.debug.value("bitsRead")).toHaveText("0 / 24");
      expect([v.settings.query().get("from"), v.settings.query().get("to")]).toEqual(["2", "4"]);
    });
  });

  test("dragging from right to left sets the same range", async ({ page }) => {
    const v = await given("2 frames are open", () => Visualizer.open(page, TWO_FRAMES));
    await when("dragging from byte 4 to byte 2 of the 2nd frame", () => v.frames.drag(1, 4, 2));
    await then("the range is bytes 2 to 4", async () => {
      await expect(v.frames.from()).toHaveValue("2");
      await expect(v.frames.to()).toHaveValue("4");
    });
  });

  test("a range that does not fit the selected frame is an error on the range", async ({ page }) => {
    const v = await given("2 frames are open", () => Visualizer.open(page, TWO_FRAMES));
    await when("setting the end of the range to byte 11, which leaves no room for the CRC field", () => v.frames.to().fill("11"));
    await then("the range shows an error, the frames are still listed, and the diagram is gone", async () => {
      await expect(v.frames.rangeError()).toBeVisible();
      await expect(v.frames.rows()).toHaveCount(2);
      await expect(v.diagram.root()).toHaveCount(0);
    });
  });

  test("the input field takes several lines in hex, and the frames are not shown in other input modes", async ({ page }) => {
    const v = await given("1 frame is open", () => Visualizer.open(page, `${X25}&input=A5`));
    await when("typing a 2nd line", async () => {
      await v.settings.field("input").click();
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
      await page.keyboard.type("0F");
    });
    await then("there are 2 frames", () => expect(v.frames.rows()).toHaveCount(2));
    await when("switching the input mode to text", () => v.settings.field("inputMode").selectOption("text"));
    await then("no frames are shown", () => expect(v.frames.rows()).toHaveCount(0));
  });
});
