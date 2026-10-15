import type { ReactNode } from "react";
import type { ConfigError, ConfigField, ConfigForm } from "../domain/parse";
import { PRESETS, type InputMode, type Preset } from "../domain/presets";
import { presetLabel } from "./presetLabel";
import type { CrcParams, ParamName } from "../domain/trace";
import { focusHandlers, type ParamFocus } from "./paramFocus";
import { useMessages } from "../i18n/I18n";
import { errorText } from "../i18n/messages";
import { FIELD_LABELS, type FieldName } from "./paramInfo";

/** Turns a preset into form values. */
export function formFromPreset({ params, input }: Preset): ConfigForm {
  return formFromParams(params, input);
}

/** The form values for params and input. */
export function formFromParams(params: CrcParams, input: Preset["input"]): ConfigForm {
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
  errors: Partial<Record<ConfigField, ConfigError>>;
  onChange: (form: ConfigForm) => void;
  focus: ParamFocus;
  /** Reports the non-parameter field under the mouse or focus (undefined when it leaves). */
  onFieldHover: (field: FieldName | undefined) => void;
}>;

const CUSTOM = "";

/** Settings panel for the CRC parameters and input. */
export function ConfigPanel({ form, presetName, errors, onChange, focus, onFieldHover }: Props) {
  const m = useMessages();
  const set = <K extends keyof ConfigForm>(key: K, value: ConfigForm[K]) => onChange({ ...form, [key]: value });
  const paramField = (param: ParamName, control: ReactNode, className = "") => {
    const error = errors[param as ConfigField];
    const classes = [className, error && "invalid", focus.focused === param && "hl"].filter(Boolean).join(" ");
    return (
      <label className={classes} data-param={param} {...focusHandlers(focus, param)}>
        <span className="param-name">{param}</span>
        {control}
        {error ? <small className="error">{errorText(m, error)}</small> : null}
      </label>
    );
  };
  const hover = (field: FieldName) => ({
    onMouseEnter: () => onFieldHover(field),
    onMouseLeave: () => onFieldHover(undefined),
    onFocus: () => onFieldHover(field),
    onBlur: () => onFieldHover(undefined),
  });
  const text = (key: "width" | "poly" | "init" | "xorout") =>
    paramField(key, <input value={form[key]} spellCheck={false} onChange={(e) => set(key, e.target.value)} />);
  const check = (key: "refin" | "refout") =>
    paramField(key, <input type="checkbox" checked={form[key]} onChange={(e) => set(key, e.target.checked)} />, "check-field");

  return (
    <form className="config" onSubmit={(e) => e.preventDefault()}>
      <label data-field="preset" {...hover("preset")}>
        <span>{FIELD_LABELS.preset}</span>
        <select
          value={presetName ?? CUSTOM}
          onChange={(e) => {
            const preset = PRESETS.find((p) => p.name === e.target.value);
            if (preset) onChange(formFromPreset(preset));
          }}
        >
          <option value={CUSTOM} disabled>
            custom
          </option>
          {PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {presetLabel(p)}
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
      <label data-field="inputMode" {...hover("inputMode")}>
        <span>{FIELD_LABELS.inputMode}</span>
        <select value={form.inputMode} onChange={(e) => set("inputMode", e.target.value as InputMode)}>
          <option value="bits">bits</option>
          <option value="hex">hex</option>
          <option value="text">text (UTF-8)</option>
        </select>
      </label>
      <label className={`input-field ${errors.input ? "invalid" : ""}`} data-field="input" {...hover("input")}>
        <span>{FIELD_LABELS.input}</span>
        <input value={form.input} spellCheck={false} onChange={(e) => set("input", e.target.value)} />
        {errors.input ? <small className="error">{errorText(m, errors.input)}</small> : null}
      </label>
    </form>
  );
}
