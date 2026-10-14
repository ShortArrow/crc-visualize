import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("画面の枠", () => {
  test("ページ自体はスクロールせず、アクティビティバー・サイドバー・エディタ領域・ステータスバーに分かれる", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await then("ページは縦にも横にもはみ出さない", async () => {
      expect(await v.workbench.pageOverflow()).toEqual({ x: 0, y: 0 });
    });
    await then("サイドバーに設定、ステータスバーにプリセット名・ステップ・crc が出る", async () => {
      await expect(v.workbench.sidebar().locator(".config")).toBeVisible();
      await expect(v.workbench.statusbar()).toContainText("CRC-3/TUTORIAL");
      await expect(v.workbench.statusbar()).toContainText("初期化");
      await expect(v.workbench.statusbar()).toContainText("crc = 0b000 0x0");
    });
    await when("xor ステップへ進む", () => v.goTo("xor"));
    await then("ステータスバーのステップと crc が変わる", async () => {
      await expect(v.workbench.statusbar()).toContainText("多項式と XOR");
      await expect(v.workbench.statusbar()).toContainText("crc = 0b011 0x3");
    });
  });

  test("Ctrl+B でサイドバーを閉じると図が広がり、再読み込みしても閉じたまま", async ({ page }) => {
    const v = await given("サイドバーを開いた既定の設定で開いている", () => Visualizer.open(page));
    const before = await v.workbench.size(".hardware");
    await when("Ctrl+B を押す", () => page.keyboard.press("Control+b"));
    await then("サイドバーが消え、図の領域が広がる", async () => {
      await expect(v.workbench.sidebar()).toHaveCount(0);
      expect((await v.workbench.size(".hardware")).width).toBeGreaterThan(before.width);
    });
    await when("再読み込みする", () => page.reload());
    await then("サイドバーは閉じたまま", async () => {
      await expect(v.workbench.sidebar()).toHaveCount(0);
      await expect(v.workbench.sidebarToggle()).toHaveAttribute("aria-pressed", "false");
    });
    await when("アクティビティバーの切替を押す", () => v.workbench.sidebarToggle().click());
    await then("サイドバーが開く", async () => {
      await expect(v.workbench.sidebar()).toBeVisible();
    });
  });

  test("境界をドラッグすると領域の大きさが変わり、再読み込みしても保たれる", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    const sidebar = (await v.workbench.size(".sidebar")).width;
    const panel = (await v.workbench.size(".panel")).height;
    await when("サイドバーの境界を右へ 80px、図とパネルの境界を上へ 60px ドラッグする", async () => {
      await v.workbench.drag("sidebar", 80, 0);
      await v.workbench.drag("panel", 0, -60);
    });
    await then("サイドバーは 80px 広く、パネルは 60px 高くなる", async () => {
      expect((await v.workbench.size(".sidebar")).width).toBeCloseTo(sidebar + 80, -1);
      expect((await v.workbench.size(".panel")).height).toBeCloseTo(panel + 60, -1);
    });
    await when("再読み込みする", () => page.reload());
    await then("広げた大きさのまま", async () => {
      expect((await v.workbench.size(".sidebar")).width).toBeCloseTo(sidebar + 80, -1);
      expect((await v.workbench.size(".panel")).height).toBeCloseTo(panel + 60, -1);
    });
  });
});
