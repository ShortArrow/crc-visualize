import { useEffect, useState } from "react";

/** Windows narrower than this (CSS px) are laid out for a phone. */
export const PHONE_WIDTH = 700;

/** Whether a window width wide (CSS px) is laid out for a phone. */
export const isPhone = (width: number): boolean => width < PHONE_WIDTH;

/** Whether the window is laid out for a phone now; follows resizes and turning the phone. */
export function usePhone(): boolean {
  const [phone, setPhone] = useState(() => isPhone(innerWidth));
  useEffect(() => {
    const onResize = () => setPhone(isPhone(innerWidth));
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);
  return phone;
}
