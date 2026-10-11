import { describe, expect, it } from "vitest";
import { restoreSettings, settingsFromQuery, settingsToQuery, type Settings } from "./settings";

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

describe("settingsToQuery / settingsFromQuery", () => {
  it("URL のクエリに書き出した設定を読み戻せる", () => {
    expect(settingsFromQuery(settingsToQuery(saved), defaults)).toEqual(saved);
  });

  it("真偽値は 1/0、速度モードは speed として書き出す", () => {
    const query = new URLSearchParams(settingsToQuery(saved));
    expect(query.get("refin")).toBe("1");
    expect(query.get("loop")).toBe("1");
    expect(query.get("speed")).toBe("steady");
    expect(query.get("inputMode")).toBe("text");
  });

  it("記号や日本語を含む入力値も読み戻せる", () => {
    const tricky: Settings = { ...saved, form: { ...saved.form, input: "a&b=c ?#日本語" } };
    expect(settingsFromQuery(settingsToQuery(tricky), defaults)).toEqual(tricky);
  });

  it("クエリに無い項目は基準の設定のままにする", () => {
    expect(settingsFromQuery("?poly=0x7", saved)).toEqual({ ...saved, form: { ...saved.form, poly: "0x7" } });
    expect(settingsFromQuery("", saved)).toEqual(saved);
  });

  it("正しくない項目は基準の設定のままにする", () => {
    expect(settingsFromQuery("?refin=maybe&inputMode=octal&rate=3&speed=fast&loop=2", saved)).toEqual(saved);
  });
});
