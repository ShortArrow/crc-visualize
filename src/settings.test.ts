import { describe, expect, it } from "vitest";
import { restoreSettings, settingsFromQuery, settingsToQuery, type Settings } from "./settings";

const defaults: Settings = {
  form: { width: "3", poly: "0x3", init: "0x0", refin: false, refout: false, xorout: "0x0", inputMode: "bits", input: "10101" },
  speedMode: "auto",
  rate: 1,
  loop: false,
  codeLang: "pseudo",
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
  codeLang: "haskell",
  locale: "de",
};

describe("restoreSettings", () => {
  it("Given no stored value, When restored, Then the defaults are used", () => {
    expect(restoreSettings(null, defaults)).toEqual(defaults);
  });

  it("Given saved settings, When restored, Then they come back unchanged", () => {
    expect(restoreSettings(JSON.stringify(saved), defaults)).toEqual(saved);
  });

  it.each(["{broken", "42"])(
    "Given stored value %j that is not valid JSON or not shaped like settings, When restored, Then the defaults are used",
    (raw) => {
      expect(restoreSettings(raw, defaults)).toEqual(defaults);
    },
  );

  it("Given a stored value with items of the wrong shape or range, When restored, Then only those items fall back to the defaults", () => {
    const raw = JSON.stringify({
      form: { ...saved.form, refin: "yes", inputMode: "octal", input: undefined },
      speedMode: "fast",
      rate: 3,
      loop: true,
      codeLang: "cobol",
      locale: "ru",
    });

    expect(restoreSettings(raw, defaults)).toEqual({
      form: { ...saved.form, refin: defaults.form.refin, inputMode: defaults.form.inputMode, input: defaults.form.input },
      speedMode: defaults.speedMode,
      rate: defaults.rate,
      loop: true,
      codeLang: defaults.codeLang,
      locale: defaults.locale,
    });
  });
});

describe("settingsToQuery / settingsFromQuery", () => {
  it("Given settings, When written to a query and read back, Then the original settings result", () => {
    expect(settingsFromQuery(settingsToQuery(saved), defaults)).toEqual(saved);
  });

  it("Given settings, When written to a query, Then booleans are 1/0, the speed mode is speed, the code language is code and the display language is lang", () => {
    const query = new URLSearchParams(settingsToQuery(saved));

    expect(query.get("refin")).toBe("1");
    expect(query.get("loop")).toBe("1");
    expect(query.get("speed")).toBe("steady");
    expect(query.get("inputMode")).toBe("text");
    expect(query.get("code")).toBe("haskell");
    expect(query.get("lang")).toBe("de");
  });

  it("Given an input value containing symbols and Japanese text, When written to a query and read back, Then the original input value results", () => {
    const tricky: Settings = { ...saved, form: { ...saved.form, input: "a&b=c ?#日本語" } };

    expect(settingsFromQuery(settingsToQuery(tricky), defaults)).toEqual(tricky);
  });

  it("Given base settings, When a query with only some items is read, Then items missing from the query keep the base value", () => {
    expect(settingsFromQuery("?poly=0x7", saved)).toEqual({ ...saved, form: { ...saved.form, poly: "0x7" } });
    expect(settingsFromQuery("", saved)).toEqual(saved);
  });

  it("Given base settings, When a query with an invalid value is read, Then that item keeps the base value", () => {
    expect(settingsFromQuery("?refin=maybe&inputMode=octal&rate=3&speed=fast&loop=2&lang=ko&code=cobol", saved)).toEqual(saved);
  });
});
