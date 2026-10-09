import type { ConfigField, ConfigForm } from "../domain/parse";
import { PRESETS, type InputMode, type Preset } from "../domain/presets";

/** プリセットをフォームの値にする。 */
export function formFromPreset({ params, input }: Preset): ConfigForm {
  const hex = (n: number) => `0x${n.toString(16).toUpperCase()}`;
  return {
    width: String(params.width),
    poly: hex(params.poly),
    init: hex(params.init),
    refin: params.refin,
    refout: params.refout,
    xorout: hex(params.xorout),
    inputMode: input.mode,
    input: input.text,
  };
}

type Props = Readonly<{
  form: ConfigForm;
  presetName: string | undefined;
  errors: Partial<Record<ConfigField, string>>;
  onChange: (form: ConfigForm) => void;
}>;

const CUSTOM = "";

/** CRC パラメータと入力の設定パネル。 */
export function ConfigPanel({ form, presetName, errors, onChange }: Props) {
  const set = <K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) => onChange({ ...form, [key]: value });
  const text = (key: "width" | "poly" | "init" | "xorout", label: string) => (
    <label className={errors[key] ? "invalid" : ""}>
      <span>{label}</span>
      <input value={form[key]} spellCheck={false} onChange={(e) => set(key, e.target.value)} />
      {errors[key] ? <small className="error">{errors[key]}</small> : null}
    </label>
  );

  return (
    <form className="config" onSubmit={(e) => e.preventDefault()}>
      <label>
        <span>プリセット</span>
        <select
          value={presetName ?? CUSTOM}
          onChange={(e) => {
            const preset = PRESETS.find((p) => p.name === e.target.value);
            if (preset) onChange(formFromPreset(preset));
          }}
        >
          <option value={CUSTOM} disabled>
            カスタム
          </option>
          {PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {text("width", "width")}
      {text("poly", "poly")}
      {text("init", "init")}
      {text("xorout", "xorout")}
      <label className="check-field">
        <input type="checkbox" checked={form.refin} onChange={(e) => set("refin", e.target.checked)} />
        <span>refin</span>
      </label>
      <label className="check-field">
        <input type="checkbox" checked={form.refout} onChange={(e) => set("refout", e.target.checked)} />
        <span>refout</span>
      </label>
      <label>
        <span>入力形式</span>
        <select value={form.inputMode} onChange={(e) => set("inputMode", e.target.value as InputMode)}>
          <option value="bits">bits</option>
          <option value="hex">hex</option>
          <option value="text">text (UTF-8)</option>
        </select>
      </label>
      <label className={`input-field ${errors.input ? "invalid" : ""}`}>
        <span>入力</span>
        <input value={form.input} spellCheck={false} onChange={(e) => set("input", e.target.value)} />
        {errors.input ? <small className="error">{errors.input}</small> : null}
      </label>
    </form>
  );
}
