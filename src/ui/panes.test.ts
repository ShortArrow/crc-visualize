import { describe, expect, it } from "vitest";
import { DEFAULT_PANES, fitLayout, restoreLayout, type PaneLayout } from "./panes";

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
