import { expect } from "@playwright/test";
import { NamesPage } from "./support/namesPage";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("ページの切替", () => {
  test("名前の規則のページへ移って戻っても、可視化の設定は変わらない", async ({ page }) => {
    const v = await given("CRC-16/KERMIT を選んで可視化のページを開いている", async () => {
      const v = await Visualizer.open(page);
      await v.settings.preset().selectOption("CRC-16/KERMIT");
      return v;
    });
    await when("アクティビティバーで名前の規則に切り替える", () => v.workbench.pageLink("names").click());
    await then("URL のフラグメントが #names になり、名前の規則のページが出る", async () => {
      expect(new URL(page.url()).hash).toBe("#names");
      await expect(page.locator(".names-page")).toBeVisible();
      await expect(page.locator(".lfsr:not(.param-map)")).toHaveCount(0);
    });
    await when("アクティビティバーで可視化に切り替える", () => v.workbench.pageLink("visualizer").click());
    await then("CRC-16/KERMIT のまま可視化のページが出る", async () => {
      await expect(v.settings.preset()).toHaveValue("CRC-16/KERMIT");
    });
  });
});

test.describe("名前の規則", () => {
  test("正式名を CRC・幅・後半の名前に分けて示す", async ({ page }) => {
    const n = await given("名前の規則のページを開いている", () => NamesPage.open(page));
    await then("CRC-16/KERMIT が CRC・16・KERMIT に分かれる", async () => {
      await expect(n.namePart("head")).toHaveText("CRC");
      await expect(n.namePart("width")).toHaveText("16");
      await expect(n.namePart("origin")).toHaveText("KERMIT");
    });
  });

  test("同じ poly の一族を並べ、先頭と違う値を強調する", async ({ page }) => {
    const n = await given("名前の規則のページを開いている", () => NamesPage.open(page));
    await then("poly 0x1021 の一族に 6 つのプリセットが並ぶ", async () => {
      await expect(n.family("0x1021").locator("tbody tr")).toHaveCount(6);
    });
    await then("XMODEM は init だけ、IBM-SDLC は refin/refout と xorout が強調される", async () => {
      await expect(n.familyCell("0x1021", "CRC-16/XMODEM", "init")).toHaveClass(/differs/);
      await expect(n.familyCell("0x1021", "CRC-16/XMODEM", "xorout")).not.toHaveClass(/differs/);
      await expect(n.familyCell("0x1021", "CRC-16/IBM-SDLC", "reflect")).toHaveClass(/differs/);
      await expect(n.familyCell("0x1021", "CRC-16/IBM-SDLC", "xorout")).toHaveClass(/differs/);
    });
  });

  test("別名から正式名を引け、流儀で割れる呼び名は候補を全て示す", async ({ page }) => {
    const n = await given("名前の規則のページを開いている", () => NamesPage.open(page));
    await then("CRC-32C は CRC-32/ISCSI を指す", async () => {
      await expect(n.aliasRow("CRC-32C").locator("td")).toHaveText("CRC-32/ISCSI");
    });
    await then("CRC-16-CCITT は KERMIT・IBM-3740・XMODEM のどれかとする", async () => {
      await expect(n.aliasRow("CRC-16-CCITT").locator("td")).toHaveText("CRC-16/KERMIT、CRC-16/IBM-3740、CRC-16/XMODEM のどれか");
    });
  });
});

test.describe("パラメータ名の別名の図", () => {
  test("引き出し線の先にはパラメータ名だけを書く", async ({ page }) => {
    const n = await given("名前の規則のページを開いている", () => NamesPage.open(page));
    await then("6 つのパラメータ名だけが並ぶ", async () => {
      await expect(n.callouts()).toHaveText(["width", "poly", "init", "refin", "refout", "xorout"]);
    });
  });

  test("パラメータ名にマウスを乗せると、効く場所を強調し、日本語名と別名の札を出す", async ({ page }) => {
    const n = await given("名前の規則のページを開いている", () => NamesPage.open(page));
    await then("マウスを乗せる前は札も強調も無い", async () => {
      await expect(n.hoverCard()).toHaveCount(0);
      await expect(n.highlighted()).toHaveCount(0);
    });
    await when("poly にマウスを乗せる", () => n.callout("poly").hover());
    await then("生成多項式と別名の札が出て、タップのゲートとフィードバック線が強調される", async () => {
      await expect(n.hoverCard()).toContainText("生成多項式");
      await expect(n.hoverCard()).toContainText("polynomial");
      await expect(n.highlighted()).not.toHaveCount(0);
      await expect(page.locator(".param-map .gate.param-hl")).toHaveCount(2);
    });
  });

  test("パラメータ名を選ぶと、対応表のその行へ移って強調する", async ({ page }) => {
    const n = await given("名前の規則のページを開いている", () => NamesPage.open(page));
    await when("refin を選ぶ", () => n.callout("refin").click());
    await then("URL のフラグメントが #names/refin になり、refin の行が強調されて見える", async () => {
      expect(new URL(page.url()).hash).toBe("#names/refin");
      await expect(n.paramRow("refin")).toHaveClass(/target/);
      await expect(n.paramRow("refin")).toBeInViewport();
      await expect(n.paramRow("poly")).not.toHaveClass(/target/);
    });
  });

  test("パラメータの行を指す URL で開くと、その行を強調する", async ({ page }) => {
    const n = await given("#names/xorout を開いている", () => NamesPage.open(page, "#names/xorout"));
    await then("xorout の行が強調されて見える", async () => {
      await expect(n.paramRow("xorout")).toHaveClass(/target/);
      await expect(n.paramRow("xorout")).toBeInViewport();
    });
  });
});
