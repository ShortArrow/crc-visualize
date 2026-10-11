import { describe, expect, it } from "vitest";
import { restoreSettings, type Settings } from "./settings";

const defaults: Settings = {
  form: { width: "3", poly: "0x3", init: "0x0", refin: false, refout: false, xorout: "0x0", inputMode: "bits", input: "10101" },
  speedMode: "auto",
  rate: 1,
  loop: false,
};

const saved: Settings = {
  form: { width: "16", poly: "0x8005", init: "0x0", refin: true, refout: true, xorout: "0x0", inputMode: "text", input: "123456789" },
  speedMode: "steady",
  rate: 4,
  loop: true,
};

describe("restoreSettings", () => {
  it("保存値が無ければ既定値を返す", () => {
    expect(restoreSettings(null, defaults)).toEqual(defaults);
  });

  it("保存した設定をそのまま復元する", () => {
    expect(restoreSettings(JSON.stringify(saved), defaults)).toEqual(saved);
  });

  it("JSON として読めなければ既定値を返す", () => {
    expect(restoreSettings("{broken", defaults)).toEqual(defaults);
    expect(restoreSettings("42", defaults)).toEqual(defaults);
  });

  it("形や値の範囲が正しくない項目だけ既定値に戻す", () => {
    const raw = JSON.stringify({
      form: { ...saved.form, refin: "yes", inputMode: "octal", input: undefined },
      speedMode: "fast",
      rate: 3,
      loop: true,
    });
    expect(restoreSettings(raw, defaults)).toEqual({
      form: { ...saved.form, refin: defaults.form.refin, inputMode: defaults.form.inputMode, input: defaults.form.input },
      speedMode: defaults.speedMode,
      rate: defaults.rate,
      loop: true,
    });
  });
});
