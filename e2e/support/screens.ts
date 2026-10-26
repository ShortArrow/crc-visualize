/** A target screen of docs/spec.md chapter 7 ("Target screens"): its size in CSS px and whether it gets the phone layout (narrower than 700). */
export type Screen = Readonly<{ name: string; width: number; height: number; phone: boolean }>;

/** The target screens of docs/spec.md chapter 7, in the order of its table; rows of the same size in CSS px are merged into one. */
export const SCREENS: readonly Screen[] = [
  { name: "iPhone SE (3rd generation)", width: 375, height: 667, phone: true },
  { name: "iPhone 11 / XR", width: 414, height: 896, phone: true },
  { name: "iPhone 12 to 14", width: 390, height: 844, phone: true },
  { name: "iPhone 15 / 16", width: 393, height: 852, phone: true },
  { name: "iPhone 16 Pro Max", width: 440, height: 956, phone: true },
  { name: "Pixel 8", width: 412, height: 915, phone: true },
  { name: "Galaxy S24", width: 360, height: 780, phone: true },
  { name: "iPhone 12 to 14 in landscape", width: 844, height: 390, phone: false },
  { name: "1920×1080 at 100%", width: 1920, height: 950, phone: false },
  { name: "1920×1080 at 125%", width: 1536, height: 734, phone: false },
  { name: "1920×1080 at 150%", width: 1280, height: 590, phone: false },
  { name: "1366×768 at 100%", width: 1366, height: 638, phone: false },
  { name: "2560×1440 at 100% / 3840×2160 at 150%", width: 2560, height: 1310, phone: false },
  { name: "3840×2160 at 100%", width: 3840, height: 2030, phone: false },
  { name: "MacBook Air 13-inch", width: 1470, height: 826, phone: false },
  { name: "iPad (10th generation)", width: 820, height: 1106, phone: false },
  { name: "iPad (10th generation) in landscape", width: 1180, height: 746, phone: false },
  { name: "iPad mini", width: 744, height: 1059, phone: false },
];

/** The screen tiers of docs/spec.md chapter 7 ("Screen tiers"). */
export type Tier = "phone" | "short" | "pc";

/** The tier screen falls in: phone narrower than 700, short screen 700 wide or more and lower than 650, PC otherwise. */
export function tierOf(screen: Screen): Tier {
  if (screen.width < 700) return "phone";
  return screen.height < 650 ? "short" : "pc";
}
