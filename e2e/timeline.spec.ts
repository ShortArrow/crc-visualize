import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

/** 一定速度 ×0.25: 1 ステップ 2400 ms、粒が前半・後半それぞれを進む時間は 768 ms。 */
const SLOW = "?speed=steady&rate=0.25";
const PHASE = { timeout: 3000 };

test.describe("1 ステップの中の時間の流れ", () => {
  test("粒が届く前に、配線・ゲート・箱に結果を見せない", async ({ page }) => {
    const v = await given("ゆっくり再生する設定で開いている", () => Visualizer.open(page, SLOW));
    await when("feedback ステップへ進んだ直後", () => v.goTo("feedback"));
    await then("結果線は塗られておらず、入力ゲートは消灯で、feedback の箱は空で灰色", async () => {
      expect(await v.diagram.painted("result")).toBeLessThan(0.1);
      expect(await v.diagram.gateLit("input")).toBe(false);
      expect(await v.diagram.feedbackShown()).toBe(false);
      expect(await v.diagram.feedbackRed()).toBe(false);
    });
    await then("前半の終わりに入力線が塗り終わり、入力ゲートが点く", async () => {
      await expect.poll(() => v.diagram.painted("input"), PHASE).toBeGreaterThan(0.99);
      await expect.poll(() => v.diagram.gateLit("input"), PHASE).toBe(true);
    });
    await then("届いた入力ビットの粒は消える", async () => {
      const opacity = () => v.diagram.particle("input").evaluate((el) => getComputedStyle(el).opacity);
      await expect.poll(opacity, PHASE).toBe("0");
    });
    await then("後半の終わりに結果線が塗り終わり、feedback の箱に 1 が入って赤くなる", async () => {
      await expect.poll(() => v.diagram.painted("result"), PHASE).toBeGreaterThan(0.99);
      await expect.poll(() => v.diagram.feedbackShown(), PHASE).toBe(true);
      await expect.poll(() => v.diagram.feedbackRed(), PHASE).toBe(true);
    });
  });

  test("次のステップの始めに、前のステップの表示を持ち越さない", async ({ page }) => {
    const v = await given("ゆっくり再生する設定で、入力ゲートが点いた feedback ステップにいる", async () => {
      const v = await Visualizer.open(page, SLOW);
      await v.goTo("feedback");
      await expect.poll(() => v.diagram.gateLit("input"), PHASE).toBe(true);
      return v;
    });
    await when("shift ステップへ進んだ直後", () => v.stepForward());
    await then("入力ゲートはすぐ消える", async () => {
      expect(await v.diagram.gateLit("input")).toBe(false);
    });
  });
});
