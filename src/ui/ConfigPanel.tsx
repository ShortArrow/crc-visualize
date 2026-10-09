import type { ReactNode } from "react";
import type { ConfigField, ConfigForm } from "../domain/parse";
import { PRESETS, type InputMode, type Preset } from "../domain/presets";
import type { ParamName } from "../domain/trace";
import { focusHandlers, type ParamFocus } from "./paramFocus";

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
  focus: ParamFocus;
}>;

const CUSTOM = "";

/** CRC パラメータと入力の設定パネル。 */
export function ConfigPanel({ form, presetName, errors, onChange, focus }: Props) {
  const set = <K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) => onChange({ ...form, [key]: value });
  const paramField = (param: ParamName, control: ReactNode, className = "") => {
    const error = errors[param as ConfigField];
    const classes = [className, error && "invalid", focus.focused === param && "hl"].filter(Boolean).join(" ");
    return (
      <label className={classes} data-param={param} {...focusHandlers(focus, param)}>
        <span className="param-name">{param}</span>
        {control}
        {error ? <small className="error">{error}</small> : null}
      </label>
    );
  };
  const text = (key: "width" | "poly" | "init" | "xorout") =>
    paramField(key, <input value={form[key]} spellCheck={false} onChange={(e) => set(key, e.target.value)} />);
  const check = (key: "refin" | "refout") =>
    paramField(
      key,
      <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />,
      "check-field",
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
            プリセットなし
          </option>
          {PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {text("width")}
      {text("poly")}
      {text("init")}
      {check("refin")}
      {check("refout")}
      {text("xorout")}
      <label>
        <span>入力形式</span>
        <select value={form.inputMode} onChange={(e) => set("inputMode", e.target.value as InputMode)}>
          <option value="bits">2 進数</option>
          <option value="hex">16 進数</option>
          <option value="text">文字列（UTF-8）</option>
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
