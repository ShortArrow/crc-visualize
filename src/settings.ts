import type { ConfigForm } from "./domain/parse";
import type { InputMode } from "./domain/presets";
import type { SpeedMode } from "./playback/playback";
import { RATES } from "./ui/Controls";

/** 次に開いたときに復元する設定。再生位置は含めない。 */
export type Settings = Readonly<{ form: ConfigForm; speedMode: SpeedMode; rate: number; loop: boolean }>;

/** localStorage のキー。保存形式を変えるときは版を上げる。 */
export const SETTINGS_KEY = "crc-visualize:settings:v1";

const INPUT_MODES: readonly InputMode[] = ["bits", "hex", "text"];
const SPEED_MODES: readonly SpeedMode[] = ["auto", "steady"];

type Fields = Readonly<Record<string, unknown>>;
const isRecord = (v: unknown): v is Fields => typeof v === "object" && v !== null && !Array.isArray(v);
const pick = <T>(v: unknown, valid: (x: unknown) => x is T, fallback: T): T => (valid(v) ? v : fallback);
const isString = (x: unknown): x is string => typeof x === "string";
const isBoolean = (x: unknown): x is boolean => typeof x === "boolean";
const oneOf =
  <T>(options: readonly T[]) =>
  (x: unknown): x is T =>
    options.includes(x as T);

function restoreForm(v: unknown, d: ConfigForm): ConfigForm {
  const f = isRecord(v) ? v : {};
  return {
    width: pick(f.width, isString, d.width),
    poly: pick(f.poly, isString, d.poly),
    init: pick(f.init, isString, d.init),
    refin: pick(f.refin, isBoolean, d.refin),
    refout: pick(f.refout, isBoolean, d.refout),
    xorout: pick(f.xorout, isString, d.xorout),
    inputMode: pick(f.inputMode, oneOf(INPUT_MODES), d.inputMode),
    input: pick(f.input, isString, d.input),
  };
}

/** 保存文字列 raw から設定を復元する。読めない・形や範囲が正しくない項目は defaults の値にする。 */
export function restoreSettings(raw: string | null, defaults: Settings): Settings {
  let parsed: unknown;
  try {
    parsed = raw === null ? undefined : JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const s = isRecord(parsed) ? parsed : {};
  return {
    form: restoreForm(s.form, defaults.form),
    speedMode: pick(s.speedMode, oneOf(SPEED_MODES), defaults.speedMode),
    rate: pick(s.rate, oneOf<number>(RATES), defaults.rate),
    loop: pick(s.loop, isBoolean, defaults.loop),
  };
}

/** localStorage から設定を読む。ストレージが使えない環境では defaults を返す。 */
export function loadSettings(defaults: Settings): Settings {
  try {
    return restoreSettings(localStorage.getItem(SETTINGS_KEY), defaults);
  } catch {
    return defaults;
  }
}

/** 設定を localStorage に書く。ストレージが使えない環境では、操作を妨げないよう何もしない。 */
export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}
