import { useEffect, useState } from "react";

/** Windows narrower than this (CSS px) are laid out for a phone. */
export const PHONE_WIDTH = 700;

/** Windows at least PHONE_WIDTH wide but lower than this (CSS px) are laid out as a short screen. */
export const SHORT_HEIGHT = 650;

/** Short screens narrower than this (CSS px) start with the sidebar closed, as a phone does. */
export const NARROW_SHORT_WIDTH = 1000;

/** The screen tiers of the layout (docs/spec.md, Screen tiers): a phone, a short screen, or a PC. */
export type Tier = "phone" | "short" | "pc";

/** Whether a window width wide (CSS px) is laid out for a phone. */
export const isPhone = (width: number): boolean => width < PHONE_WIDTH;

/** The tier of a window width × height (CSS px). */
export const tierOf = (width: number, height: number): Tier =>
  isPhone(width) ? "phone" : height < SHORT_HEIGHT ? "short" : "pc";

/**
 * Whether the sidebar of a window width × height (CSS px) opens and closes as saved in the layout. A phone and a short screen
 * narrower than NARROW_SHORT_WIDTH start with it closed on every load instead, without saving (docs/spec.md, Screen tiers).
 */
export const keepsSidebarState = (width: number, height: number): boolean => {
  const tier = tierOf(width, height);
  return tier === "pc" || (tier === "short" && width >= NARROW_SHORT_WIDTH);
};

/** What the window is laid out for now: its tier and whether its sidebar follows the saved layout. Follows resizes and turning the phone. */
export function useScreen(): Readonly<{ tier: Tier; keepsSidebar: boolean }> {
  const [size, setSize] = useState(() => ({ width: innerWidth, height: innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ width: innerWidth, height: innerHeight });
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);
  return { tier: tierOf(size.width, size.height), keepsSidebar: keepsSidebarState(size.width, size.height) };
}

/** The tier the window is laid out for now; follows resizes and turning the phone. */
export const useTier = (): Tier => useScreen().tier;
