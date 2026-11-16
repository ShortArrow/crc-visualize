import type { ReactNode } from "react";
import type { CompareError } from "../domain/compare";
import type { ConfigError } from "../domain/parse";
import { useMessages } from "../i18n/I18n";
import { errorText } from "../i18n/messages";
import { valueHex } from "./format";

type Props = Readonly<{
  /** Names the field in data-field. */
  name: string;
  /** The label, in English only like the settings panel. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** A text area of several lines rather than one line. */
  multiline?: boolean;
  /** The badges that choose how the pasted numbers are read. */
  badges: ReactNode;
  error: ConfigError | CompareError | undefined;
  /** A line under the field about what was pasted, shown when there is no error. */
  note?: ReactNode;
}>;

/** A field values are pasted into, with its badges beside it and the error of what was pasted under it. */
export function PasteField({ name, label, value, onChange, multiline = false, badges, error, note }: Props) {
  const m = useMessages();
  return (
    <label data-field={name} className={error ? "invalid" : undefined}>
      <span>{label}</span>
      <span className="field-row">
        {multiline ? (
          <textarea wrap="off" rows={3} value={value} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input value={value} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
        )}
        <span className="badges">{badges}</span>
      </span>
      {error ? <small className="error">{errorText(m, error)}</small> : note}
    </label>
  );
}

/** The bits of value in width bits, MSB first, those that differ from other marked. */
function BitRow({ value, other, width }: Readonly<{ value: bigint; other: bigint; width: number }>) {
  return (
    <code className="compare-bits">
      {Array.from({ length: width }, (_, i) => {
        const k = BigInt(width - 1 - i);
        const bit = (value >> k) & 1n;
        return (
          <span key={i} className={bit === ((other >> k) & 1n) ? undefined : "diff"}>
            {String(bit)}
          </span>
        );
      })}
    </code>
  );
}

/** A pasted value against the computed one: ✓ when they match, otherwise both in binary with the differing bits marked. */
export function ValueResult({ yours, computed, width }: Readonly<{ yours: bigint; computed: bigint; width: number }>) {
  const m = useMessages();
  if (yours === computed) {
    return (
      <p className="compare-result ok" data-result="ok">
        ✓ {m.compare.matches} {valueHex(computed, width)}
      </p>
    );
  }
  return (
    <div className="compare-result ng" data-result="ng">
      <span>✗ {m.compare.yours}</span>
      <BitRow value={yours} other={computed} width={width} />
      <span>{m.compare.computed}</span>
      <BitRow value={computed} other={yours} width={width} />
    </div>
  );
}
