import { useEffect, useState } from "react";

/** Windows narrower than this (CSS px) are laid out for a phone. */
export const PHONE_WIDTH = 700;

/** Windows at least PHONE_WIDTH wide but lower than this (CSS px) are laid out as a short screen. */
export const SHORT_HEIGHT = 650;

/** The screen tiers of the layout (docs/spec.md, Screen tiers): a phone, a short screen, or a PC. */
export type Tier = "phone" | "short" | "pc";

/** Whether a window width wide (CSS px) is laid out for a phone. */
export const isPhone = (width: number): boolean => width < PHONE_WIDTH;

/** The tier of a window width × height (CSS px). */
export const tierOf = (width: number, height: number): Tier =>
  isPhone(width) ? "phone" : height < SHORT_HEIGHT ? "short" : "pc";

/** The tier the window is laid out for now; follows resizes and turning the phone. */
export function useTier(): Tier {
  const [tier, setTier] = useState(() => tierOf(innerWidth, innerHeight));
  useEffect(() => {
    const onResize = () => setTier(tierOf(innerWidth, innerHeight));
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);
  return tier;
}
