import { expect } from "@playwright/test";
import { given, test, then, when } from "./support/scenario";
import { Visualizer } from "./support/visualizer";

test.describe("図の値の流れ（CRC-3/TUTORIAL、1 番目のクロックは feedback 1）", () => {
  test("フィードバックビットの計算では、入力ビットと最上位ビットが入力ゲートで合流し、結果が feedback の箱に入る", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("1 番目のクロックの feedback ステップへ進む", () => v.goTo("feedback"));
    await then("入力ビット 1 と最上位ビット 0 の粒が入力ゲートへ向かう", async () => {
      await expect(v.diagram.particle("input")).toHaveText("1");
      await expect(v.diagram.particle("msb")).toHaveText("0");
      await expect(v.diagram.wire("input")).toHaveAttribute("data-level", "1");
      await expect(v.diagram.wire("msb")).toHaveAttribute("data-level", "0");
    });
    await then("結果 1 の粒が結果線を通って feedback の箱に入る", async () => {
      await expect(v.diagram.particle("result")).toHaveText("1");
      await expect(v.diagram.wire("result")).toHaveAttribute("data-level", "1");
      await expect(v.diagram.feedbackValue()).toHaveText("1");
      await expect(v.diagram.feedbackBox()).toHaveAttribute("data-level", "1");
    });
    await then("feedback はまだゲートへ送られない", async () => {
      await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "none");
    });
  });

  test("シフトの間、feedback の値は箱に留まり、フィードバック線には流れない", async ({ page }) => {
    const v = await given("1 番目のクロックの feedback ステップにいる", async () => {
      const v = await Visualizer.open(page);
      await v.goTo("feedback");
      return v;
    });
    await when("shift ステップへ進む", () => v.stepForward());
    await then("feedback の箱は 1 のままで、結果線とフィードバック線には何も流れない", async () => {
      await expect(v.diagram.feedbackValue()).toHaveText("1");
      await expect(v.diagram.wire("result")).toHaveAttribute("data-level", "none");
      await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "none");
      await expect(v.diagram.particles()).toHaveCount(0);
    });
  });

  test("xor では feedback の箱から各タップのゲートへ 1 が運ばれ、r[i] との XOR の結果が箱へ戻る", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("1 番目のクロックの xor ステップへ進む", () => v.goTo("xor"));
    await then("1 の粒が feedback の箱からタップ 0 と 1 のゲートへ向かい、フィードバック線が 1 になる", async () => {
      await expect(v.diagram.particle("tap-0")).toHaveText("1");
      await expect(v.diagram.particle("tap-1")).toHaveText("1");
      await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "1");
      await expect(v.diagram.wire("feedback-1")).toHaveAttribute("data-level", "1");
    });
    await then("各 r[i] の値 0 が左の脚を下り、結果 1 が右の脚を上がる", async () => {
      await expect(v.diagram.particles()).toHaveCount(6);
      for (const i of [0, 1]) {
        await expect(v.diagram.particle(`in-${i}`)).toHaveText("0");
        await expect(v.diagram.particle(`out-${i}`)).toHaveText("1");
        await expect(v.diagram.wire(`tap-in-${i}`)).toHaveAttribute("data-level", "0");
        await expect(v.diagram.wire(`tap-out-${i}`)).toHaveAttribute("data-level", "1");
      }
    });
    await then("入力線には何も流れない", async () => {
      await expect(v.diagram.wire("input")).toHaveAttribute("data-level", "none");
    });
  });

  test("feedback が 0 のクロックでは xor が来ず、箱は白で、フィードバック線に何も流れない", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("2 番目のクロック（feedback 0）の shift ステップへ進む", () => v.goTo("shift", 2));
    await then("feedback の箱は 0 で白く、フィードバック線は灰色のまま", async () => {
      await expect(v.diagram.feedbackValue()).toHaveText("0");
      await expect(v.diagram.feedbackBox()).toHaveAttribute("data-level", "0");
      await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "none");
    });
    await then("次のステップは xor ではなく次のクロックの feedback", async () => {
      await v.stepForward();
      expect(await v.stepKind()).toBe("feedback");
    });
  });

  test("図は配線の色と粒だけで流れを示し、計算式の文字列を出さない", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await then("先頭のステップでは粒も値の流れる配線も無い", async () => {
      await expect(v.diagram.particles()).toHaveCount(0);
      await expect(v.diagram.wire("feedback-0")).toHaveAttribute("data-level", "none");
    });
    await when("xor ステップへ進む", () => v.goTo("xor"));
    await then("図に ⊕ や = の式は無く、凡例が ⊕ の意味を示す", async () => {
      await expect(v.diagram.root()).not.toContainText("⊕");
      await expect(v.diagram.root()).not.toContainText("=");
      await expect(page.locator(".legend")).toContainText("⊕ = XOR（2 入力が異なれば 1）");
    });
    await then("直線の配線でも光彩が消えないよう、光彩の範囲を図全体の座標で取る", async () => {
      expect(await page.locator(".lfsr filter#glow").getAttribute("filterUnits")).toBe("userSpaceOnUse");
    });
  });
});

test.describe("レジスタの箱", () => {
  test("xor では poly の 1 のビットの箱だけ値が裏返り、箱の色は変わらない", async ({ page }) => {
    const v = await given("既定の設定（poly 0x3）で開いている", () => Visualizer.open(page));
    await when("xor ステップへ進む", () => v.goTo("xor"));
    await then("r0 と r1 だけが裏返る", async () => {
      await expect(v.diagram.register(0)).toHaveClass(/\bhit\b/);
      await expect(v.diagram.register(1)).toHaveClass(/\bhit\b/);
      await expect(v.diagram.register(2)).not.toHaveClass(/\bhit\b/);
    });
    await then("裏返る箱も裏返らない r2 と同じ色のまま", async () => {
      const same = async (bit: number) => (await v.diagram.registerLook(bit)) === (await v.diagram.registerLook(2));
      await expect.poll(() => same(0)).toBe(true);
      await expect.poll(() => same(1)).toBe(true);
    });
  });

  test("shift では元の r[width-1] が桁あふれして左へ抜ける", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("shift ステップへ進む", () => v.goTo("shift"));
    await then("r2 の元の値 0 が抜けていく", async () => {
      await expect(v.diagram.register(2).locator(".drop")).toHaveText("0");
    });
  });

  test("shift で左へ抜ける値は、隣の箱へ移る値と同じ速さで動く", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("shift ステップへ進む", () => v.goTo("shift"));
    await then("途中のどの時点でも、r2 から抜ける値と r0 から r1 へ移る値の動いた距離が等しい", async () => {
      for (const progress of [0.25, 0.5, 0.9]) {
        const dropped = await v.diagram.travelX(v.diagram.dropped(), progress);
        const sliding = await v.diagram.travelX(v.diagram.sliding(1), progress);
        expect(dropped).toBeCloseTo(sliding, 0);
      }
    });
  });

  test("次が shift なら、r0 に入る値を r0 の真横に控えとして先に出す", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await then("先頭のステップでは控えを出さない", async () => {
      await expect(v.diagram.upcoming()).toHaveCount(0);
    });
    await when("次が shift の feedback ステップへ進む", () => v.goTo("feedback"));
    await then("r0 に入る 0 を、値が入ってくる右側の、箱と同じ高さに出す", async () => {
      await expect(v.diagram.upcoming()).toHaveCount(1);
      await expect(v.diagram.upcoming()).toHaveAttribute("data-bit", "0");
      await expect(v.diagram.upcoming()).toHaveText("0");
      const box = (await v.diagram.register(0).locator("rect").boundingBox())!;
      const hint = (await v.diagram.upcoming().boundingBox())!;
      expect(hint.x).toBeGreaterThan(box.x + box.width);
      expect(hint.y + hint.height / 2).toBeCloseTo(box.y + box.height / 2, 0);
    });
    await when("次が xor の shift ステップへ進む", () => v.stepForward());
    await then("xor の結果は粒が見せるので控えを出さない", async () => {
      await expect(v.diagram.upcoming()).toHaveCount(0);
    });
  });

  test("完了するとレジスタが緑になり、入力の後ろに CRC を連結して示す", async ({ page }) => {
    const v = await given("既定の設定（入力 10101）で開いている", () => Visualizer.open(page));
    await when("末尾へ進む", () => v.goToEnd());
    await then("全ての箱が完了の色になる", async () => {
      for (const bit of [0, 1, 2]) await expect(v.diagram.register(bit)).toHaveClass(/\bdone\b/);
    });
    await then("入力 10101 の後ろに CRC 101 が続く", async () => {
      await expect(page.locator(".framed")).toHaveText("10101101");
      await expect(page.locator(".crc-tail")).toHaveText("101");
    });
  });
});

test.describe("ゲートの点灯", () => {
  test("ゲートは計算に使われるステップでだけ黄に点き、フィードバックビットの値にはよらない", async ({ page }) => {
    const v = await given("既定の設定で開いている", () => Visualizer.open(page));
    await when("feedback 1 のクロックの feedback ステップへ進む", () => v.goTo("feedback"));
    await then("入力ゲートだけが点く", async () => {
      await expect.poll(() => v.diagram.gateLit("input")).toBe(true);
      await expect.poll(() => v.diagram.gateLit(1)).toBe(false);
    });
    await when("xor ステップへ進む", () => v.goTo("xor"));
    await then("タップのゲートだけが点く", async () => {
      await expect.poll(() => v.diagram.gateLit("input")).toBe(false);
      await expect.poll(() => v.diagram.gateLit(1)).toBe(true);
    });
    await when("feedback 0 のクロックの feedback ステップへ進む", () => v.goTo("feedback"));
    await then("入力ゲートが点く", async () => {
      await expect.poll(() => v.diagram.gateLit("input")).toBe(true);
    });
  });
});
