import { describe, expect, it } from "vitest";
import { DEFAULT_PANES, fitLayout, fitPanelRatio, restoreLayout, type PaneLayout } from "./panes";

const custom: PaneLayout = { sidebarOpen: false, sidebarWidth: 360, panelRatio: 0.5, codeRatio: 0.7 };

describe("restoreLayout", () => {
  it("Given no stored value, When restoring, Then the default pane layout", () => {
    expect(restoreLayout(null)).toEqual(DEFAULT_PANES);
  });

  it("Given a stored pane layout, When restoring, Then it comes back unchanged", () => {
    expect(restoreLayout(JSON.stringify(custom))).toEqual(custom);
  });

  it.each(["{broken", "[]"])("Given an unreadable stored value %j, When restoring, Then the default pane layout", (raw) => {
    expect(restoreLayout(raw)).toEqual(DEFAULT_PANES);
  });

  it("Given a stored value with malformed items, When restoring, Then only those items fall back to the defaults", () => {
    const raw = JSON.stringify({ ...custom, sidebarOpen: "no", panelRatio: "half" });

    expect(restoreLayout(raw)).toEqual({
      ...custom,
      sidebarOpen: DEFAULT_PANES.sidebarOpen,
      panelRatio: DEFAULT_PANES.panelRatio,
    });
  });
});

describe("fitLayout", () => {
  it("Given a pane layout within range, When fitting it to a 1366px-wide screen, Then it is unchanged", () => {
    expect(fitLayout(custom, 1366)).toEqual(custom);
  });

  it("Given a too-narrow sidebar and splits too close to the edges, When fitting, Then the sidebar becomes 200px and the split ratios are clamped to 0.15–0.85", () => {
    const layout = fitLayout({ ...custom, sidebarWidth: 50, panelRatio: 0.01, codeRatio: 0.99 }, 1366);

    expect(layout).toMatchObject({ sidebarWidth: 200, panelRatio: 0.15, codeRatio: 0.85 });
  });

  it("Given a sidebar wider than half the screen, When fitting it to a 1000px-wide screen, Then the sidebar is clamped to half the screen, 500px", () => {
    expect(fitLayout({ ...custom, sidebarWidth: 700 }, 1000).sidebarWidth).toBe(500);
  });
});

describe("fitPanelRatio", () => {
  const split = { height: 1000, chrome: 60, width: 800 };
  const view = { width: 1600, height: 320 };

  it("Given a diagram that shrinks to the area's width, When fitting, Then the panel takes all the height the drawn diagram leaves", () => {
    expect(fitPanelRatio(0.4, split, view, 0)).toBeCloseTo(1 - (60 + 160) / 1000);
  });

  it("Given a diagram held at its smallest readable width, When fitting, Then the area keeps the height of the diagram at that width", () => {
    expect(fitPanelRatio(0.4, split, view, 1200)).toBeCloseTo(1 - (60 + 240) / 1000);
  });

  it("Given a diagram that the area's height limits, When fitting, Then the chosen ratio stays", () => {
    expect(fitPanelRatio(0.4, { ...split, width: 4000 }, view, 0)).toBe(0.4);
  });

  it("Given a tiny diagram, When fitting, Then the panel stops at the largest ratio", () => {
    expect(fitPanelRatio(0.4, { ...split, width: 100 }, view, 0)).toBe(0.85);
  });
});
