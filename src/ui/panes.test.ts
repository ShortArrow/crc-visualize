import { describe, expect, it } from "vitest";
import { DEFAULT_PANES, fitLayout, restoreLayout, type PaneLayout } from "./panes";

const custom: PaneLayout = { sidebarOpen: false, sidebarWidth: 360, panelRatio: 0.5, codeRatio: 0.7 };

describe("restoreLayout", () => {
  it("Given 保存値が無い, When 復元する, Then 既定の画面割り", () => {
    expect(restoreLayout(null)).toEqual(DEFAULT_PANES);
  });

  it("Given 保存した画面割り, When 復元する, Then そのまま戻る", () => {
    expect(restoreLayout(JSON.stringify(custom))).toEqual(custom);
  });

  it.each(["{broken", "[]"])("Given 読めない保存値 %j, When 復元する, Then 既定の画面割り", (raw) => {
    expect(restoreLayout(raw)).toEqual(DEFAULT_PANES);
  });

  it("Given 形の正しくない項目を含む保存値, When 復元する, Then その項目だけ既定値に戻す", () => {
    const raw = JSON.stringify({ ...custom, sidebarOpen: "no", panelRatio: "half" });

    expect(restoreLayout(raw)).toEqual({ ...custom, sidebarOpen: DEFAULT_PANES.sidebarOpen, panelRatio: DEFAULT_PANES.panelRatio });
  });
});

describe("fitLayout", () => {
  it("Given 範囲内の画面割り, When 横幅 1366px の画面に合わせる, Then そのまま", () => {
    expect(fitLayout(custom, 1366)).toEqual(custom);
  });

  it("Given 狭すぎるサイドバーと端に寄りすぎた境界, When 合わせる, Then サイドバーは 200px、境界の比は 0.15〜0.85 に収める", () => {
    const layout = fitLayout({ ...custom, sidebarWidth: 50, panelRatio: 0.01, codeRatio: 0.99 }, 1366);

    expect(layout).toMatchObject({ sidebarWidth: 200, panelRatio: 0.15, codeRatio: 0.85 });
  });

  it("Given 画面の半分より広いサイドバー, When 横幅 1000px の画面に合わせる, Then サイドバーは画面の半分 500px に収める", () => {
    expect(fitLayout({ ...custom, sidebarWidth: 700 }, 1000).sidebarWidth).toBe(500);
  });
});
