import { useEffect, useState, type PointerEvent } from "react";
import { checkFrame, CRC_FIELDS, frameSpan, type CrcField } from "../domain/frames";
import { readFrames, readWidth, type ConfigError, type ConfigForm } from "../domain/parse";
import type { CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { errorText } from "../i18n/messages";
import { FIELD_LABELS, type FieldName } from "./paramInfo";

type Props = Readonly<{
  form: ConfigForm;
  /** The parameters when the settings are valid; without them no CRC is computed, but the range is still marked. */
  params: CrcParams | undefined;
  rangeError: ConfigError | undefined;
  onChange: (form: ConfigForm) => void;
  onFieldHover: (field: FieldName | undefined) => void;
}>;

const hexOf = (value: number, width: number) =>
  `0x${value
    .toString(16)
    .toUpperCase()
    .padStart(Math.ceil(width / 4), "0")}`;
const byteHex = (b: number) => b.toString(16).toUpperCase().padStart(2, "0");

/**
 * The frames of hex input, one row per line: the byte numbers of the CRC range and the CRC field, shared by every frame, and for
 * each frame its bytes (the range and the field marked), its computed CRC, the value in its CRC field and whether they agree.
 * Dragging across the bytes of any frame sets the range; picking a frame visualizes it. Nothing is shown unless the input is hex.
 */
export function FramePanel({ form, params, rangeError, onChange, onFieldHover }: Props) {
  const m = useMessages();
  const [anchor, setAnchor] = useState<number | undefined>(undefined);
  useEffect(() => {
    const end = () => setAnchor(undefined);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);
  const frames = readFrames(form);
  if (!frames) return null;
  const width = params?.width ?? readWidth(form);

  const setRange = (a: number, b: number) => onChange({ ...form, from: String(Math.min(a, b)), to: String(Math.max(a, b)) });
  const startDrag = (e: PointerEvent, k: number) => {
    e.preventDefault();
    setAnchor(k);
    setRange(k, k);
  };
  const dragOver = (e: PointerEvent) => {
    if (anchor === undefined) return;
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(".frame-byte");
    if (cell?.dataset.byte !== undefined) setRange(anchor, Number(cell.dataset.byte));
  };
  const hover = (field: FieldName) => ({
    onMouseEnter: () => onFieldHover(field),
    onMouseLeave: () => onFieldHover(undefined),
    onFocus: () => onFieldHover(field),
    onBlur: () => onFieldHover(undefined),
  });

  return (
    <div className="frames">
      <div className="frame-layout config">
        <label className={rangeError ? "invalid" : ""} data-field="range" {...hover("range")}>
          <span>{FIELD_LABELS.range}</span>
          <span className="frame-range">
            <input
              data-range="from"
              inputMode="numeric"
              placeholder="0"
              value={form.from}
              onChange={(e) => onChange({ ...form, from: e.target.value })}
            />
            <span>–</span>
            <input
              data-range="to"
              inputMode="numeric"
              placeholder={m.frames.toEnd}
              value={form.to}
              onChange={(e) => onChange({ ...form, to: e.target.value })}
            />
          </span>
          {rangeError ? <small className="error">{errorText(m, rangeError)}</small> : null}
        </label>
        <label data-field="crcField" {...hover("crcField")}>
          <span>{FIELD_LABELS.crcField}</span>
          <select value={form.crcField} onChange={(e) => onChange({ ...form, crcField: e.target.value as CrcField })}>
            {CRC_FIELDS.map((f) => (
              <option key={f} value={f}>
                {f === "none" ? m.frames.noField : f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ol className="frame-list" onPointerMove={dragOver}>
        {frames.list.map((bytes, i) => {
          const check = params && checkFrame(params, bytes, frames.layout);
          const span = width === undefined ? undefined : frameSpan(bytes.length, frames.layout, width);
          const inRange = (k: number) => span !== undefined && k >= span.from && k <= span.to;
          const inField = (k: number) => span?.field !== undefined && k >= span.field.from && k <= span.field.to;
          const ok = check?.field === undefined ? undefined : check.field === check.crc;
          return (
            <li
              key={i}
              className={`frame-row ${i === frames.selected ? "selected" : ""} ${width !== undefined && !span ? "unfit" : ""}`}
              data-frame={i}
            >
              <div className="frame-head">
                <button
                  type="button"
                  className="frame-pick"
                  aria-pressed={i === frames.selected}
                  title={m.frames.pick(i)}
                  onClick={() => onChange({ ...form, frame: String(i) })}
                >
                  #{i}
                </button>
                {check ? (
                  <>
                    <span className="frame-value">
                      crc <code className="frame-crc">{hexOf(check.crc, params!.width)}</code>
                    </span>
                    {check.field === undefined ? null : (
                      <span className="frame-value">
                        field <code className="frame-field">{hexOf(check.field, params!.width)}</code>
                      </span>
                    )}
                    {ok === undefined ? null : (
                      <span className="frame-verdict" data-ok={ok} title={ok ? m.frames.match : m.frames.mismatch}>
                        {ok ? "✓" : "✗"}
                      </span>
                    )}
                  </>
                ) : width !== undefined && !span ? (
                  <span className="frame-unfit">{m.frames.unfit}</span>
                ) : null}
              </div>
              <div className="frame-bytes">
                {bytes.map((b, k) => (
                  <span
                    key={k}
                    className={`frame-byte ${inRange(k) ? "in-range" : ""} ${inField(k) ? "crc-field" : ""}`}
                    data-byte={k}
                    title={`byte ${k}`}
                    onPointerDown={(e) => startDrag(e, k)}
                  >
                    {byteHex(b)}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
