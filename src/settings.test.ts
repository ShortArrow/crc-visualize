import { describe, expect, it } from "vitest";
import { restoreSettings, settingsFromQuery, settingsToQuery, type Settings } from "./settings";

const defaults: Settings = {
  form: { width: "3", poly: "0x3", init: "0x0", refin: false, refout: false, xorout: "0x0", inputMode: "bits", input: "10101" },
  speedMode: "auto",
  rate: 1,
  loop: false,
  locale: "ja",
};

const saved: Settings = {
  form: {
    width: "16",
    poly: "0x8005",
    init: "0x0",
    refin: true,
    refout: true,
    xorout: "0x0",
    inputMode: "text",
    input: "123456789",
  },
  speedMode: "steady",
  rate: 4,
  loop: true,
  locale: "de",
};

describe("restoreSettings", () => {
  it("Given 保存値が無い, When 復元する, Then 既定値になる", () => {
    expect(restoreSettings(null, defaults)).toEqual(defaults);
  });

  it("Given 保存した設定, When 復元する, Then そのまま戻る", () => {
    expect(restoreSettings(JSON.stringify(saved), defaults)).toEqual(saved);
  });

  it.each(["{broken", "42"])(
    "Given JSON として読めない、または設定の形でない保存値 %j, When 復元する, Then 既定値になる",
    (raw) => {
      expect(restoreSettings(raw, defaults)).toEqual(defaults);
    },
  );

  it("Given 形や値の範囲が正しくない項目を含む保存値, When 復元する, Then その項目だけ既定値に戻す", () => {
    const raw = JSON.stringify({
      form: { ...saved.form, refin: "yes", inputMode: "octal", input: undefined },
      speedMode: "fast",
      rate: 3,
      loop: true,
      locale: "ru",
    });

    expect(restoreSettings(raw, defaults)).toEqual({
      form: { ...saved.form, refin: defaults.form.refin, inputMode: defaults.form.inputMode, input: defaults.form.input },
      speedMode: defaults.speedMode,
      rate: defaults.rate,
      loop: true,
      locale: defaults.locale,
    });
  });
});

describe("settingsToQuery / settingsFromQuery", () => {
  it("Given 設定, When クエリに書き出して読み戻す, Then 元の設定になる", () => {
    expect(settingsFromQuery(settingsToQuery(saved), defaults)).toEqual(saved);
  });

  it("Given 設定, When クエリに書き出す, Then 真偽値は 1/0、速度モードは speed、表示言語は lang になる", () => {
    const query = new URLSearchParams(settingsToQuery(saved));

    expect(query.get("refin")).toBe("1");
    expect(query.get("loop")).toBe("1");
    expect(query.get("speed")).toBe("steady");
    expect(query.get("inputMode")).toBe("text");
    expect(query.get("lang")).toBe("de");
  });

  it("Given 記号や日本語を含む入力値, When クエリに書き出して読み戻す, Then 元の入力値になる", () => {
    const tricky: Settings = { ...saved, form: { ...saved.form, input: "a&b=c ?#日本語" } };

    expect(settingsFromQuery(settingsToQuery(tricky), defaults)).toEqual(tricky);
  });

  it("Given 基準の設定, When 一部の項目だけのクエリを読む, Then クエリに無い項目は基準のまま", () => {
    expect(settingsFromQuery("?poly=0x7", saved)).toEqual({ ...saved, form: { ...saved.form, poly: "0x7" } });
    expect(settingsFromQuery("", saved)).toEqual(saved);
  });

  it("Given 基準の設定, When 正しくない値のクエリを読む, Then その項目は基準のまま", () => {
    expect(settingsFromQuery("?refin=maybe&inputMode=octal&rate=3&speed=fast&loop=2&lang=ko", saved)).toEqual(saved);
  });
});
