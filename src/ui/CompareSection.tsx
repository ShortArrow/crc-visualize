import { useEffect } from "react";
import { matchLog, type LogMatch } from "../domain/compare";
import { elementOf, readCrc, readValues, type Base, type ElementId } from "../domain/paste";
import { registerValue, type CrcParams, type Step } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { errorText, type Messages } from "../i18n/messages";
import { Badge, elementText, nextElement } from "./Badge";
import { valueHex } from "./format";

/** What is pasted into the Compare section and how it is read; kept neither in the URL nor in storage. */
export type CompareForm = Readonly<{
  crc: string;
  crcBase: Base;
  crcElement: ElementId;
  crcOrder: "be" | "le";
  log: string;
  logBase: Base;
}>;

export const EMPTY_COMPARE: CompareForm = { crc: "", crcBase: 16, crcElement: "8", crcOrder: "be", log: "", logBase: 16 };

type Props = Readonly<{
  params: CrcParams;
  steps: readonly Step[];
  form: CompareForm;
  onChange: (form: CompareForm) => void;
  /** Moves playback to the step at index. */
  onSeek: (index: number) => void;
}>;

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
function ValueResult({ yours, computed, width }: Readonly<{ yours: bigint; computed: bigint; width: number }>) {
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

const rowName = (m: Messages, match: LogMatch, at: "init" | number) =>
  at === "init" ? "init" : `${match.unit === "byte" ? m.compare.byte : m.compare.bit} ${at}`;

function LogTable({ match, width }: Readonly<{ match: LogMatch; width: number }>) {
  const m = useMessages();
  return (
    <div className="compare-result" data-result={match.firstDiff === undefined ? "ok" : "ng"}>
      {match.shift === "right" ? <p className="compare-note">{m.compare.rightShift}</p> : null}
      {match.firstDiff === undefined ? null : (
        <p className="compare-note">
          {m.compare.firstDiff}: {rowName(m, match, match.rows[match.firstDiff]!.at)}
        </p>
      )}
      <table className="compare-log">
        <thead>
          <tr>
            <th />
            <th>{m.compare.yours}</th>
            <th>{m.compare.computed}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {match.rows.map((row, i) => (
            <tr key={i} className={i === match.firstDiff ? "first-diff" : undefined}>
              <th>{rowName(m, match, row.at)}</th>
              <td>{valueHex(row.yours, width)}</td>
              <td>{valueHex(row.computed, width)}</td>
              <td className={row.ok ? "ok" : "ng"}>{row.ok ? "✓" : "✗"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The Visualizer's Compare section (spec chapter 16): your crc against the CRC of the range, and your log against the register
 * after each byte or bit. When the log differs, playback moves to the end of its first differing row.
 */
export function CompareSection({ params, steps, form, onChange, onSeek }: Props) {
  const m = useMessages();
  const set = <K extends keyof CompareForm>(key: K, value: CompareForm[K]) => onChange({ ...form, [key]: value });
  const { width } = params;
  const crc =
    form.crc.trim() === "" ? undefined : readCrc(form.crc, form.crcBase, elementOf(form.crcElement), form.crcOrder, width);
  const values = form.log.trim() === "" ? undefined : readValues(form.log, form.logBase, width);
  const log = values?.ok ? matchLog(params, steps, values.value) : values;
  const diffStep = log?.ok && log.value.firstDiff !== undefined ? log.value.rows[log.value.firstDiff]!.step : undefined;

  useEffect(() => {
    if (diffStep !== undefined) onSeek(diffStep);
  }, [diffStep, steps]);

  const baseBadge = (key: "crcBase" | "logBase") => (
    <Badge kind="base" name={m.badges.base} text={String(form[key])} onPress={() => set(key, form[key] === 16 ? 10 : 16)} />
  );
  return (
    <form className="compare" onSubmit={(e) => e.preventDefault()}>
      <label data-field="yourCrc" className={crc && !crc.ok ? "invalid" : undefined}>
        <span>your crc</span>
        <span className="field-row">
          <input value={form.crc} spellCheck={false} onChange={(e) => set("crc", e.target.value)} />
          <span className="badges">
            {baseBadge("crcBase")}
            <Badge
              kind="element"
              name={m.badges.element}
              text={elementText(form.crcElement)}
              onPress={() => set("crcElement", nextElement(form.crcElement))}
            />
            <Badge
              kind="order"
              name={m.badges.order}
              text={form.crcOrder.toUpperCase()}
              onPress={() => set("crcOrder", form.crcOrder === "be" ? "le" : "be")}
            />
          </span>
        </span>
        {crc && !crc.ok ? <small className="error">{errorText(m, crc.error)}</small> : null}
      </label>
      {crc?.ok ? <ValueResult yours={crc.value} computed={registerValue(steps.at(-1)!.reg)} width={width} /> : null}
      <label data-field="yourLog" className={log && !log.ok ? "invalid" : undefined}>
        <span>your log</span>
        <span className="field-row">
          <textarea wrap="off" rows={3} value={form.log} spellCheck={false} onChange={(e) => set("log", e.target.value)} />
          <span className="badges">{baseBadge("logBase")}</span>
        </span>
        {log && !log.ok ? <small className="error">{errorText(m, log.error)}</small> : null}
      </label>
      {log?.ok ? <LogTable match={log.value} width={width} /> : null}
    </form>
  );
}
