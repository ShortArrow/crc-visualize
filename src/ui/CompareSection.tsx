import { useEffect } from "react";
import { matchLog, type LogMatch } from "../domain/compare";
import { crcOf } from "../domain/equivalence";
import { asHints, presetHints, rangeHints, rowHints, valueHints, type CrcRange, type Hint } from "../domain/hints";
import { CATALOGUE } from "../domain/presets";
import { elementOf, readCrc, readValues, type Base, type CrcRead, type Element, type ElementId } from "../domain/paste";
import { registerValue, type Bit, type CrcParams, type Step } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import type { Messages } from "../i18n/messages";
import { Badge, elementText, nextElement } from "./Badge";
import { valueHex } from "./format";
import { HintList, PasteField, ValueResult } from "./PasteField";
import { useReveal } from "./reveal";

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
  /** The bits the CRC is computed over. */
  bits: readonly Bit[];
  /** The CRC range among the bytes around it, for hint 6; undefined when it cannot move. */
  range: CrcRange | undefined;
  form: CompareForm;
  onChange: (form: CompareForm) => void;
  /** Moves playback to the step at index. */
  onSeek: (index: number) => void;
}>;

const rowName = (m: Messages, match: LogMatch, at: "init" | number) =>
  at === "init" ? "init" : `${match.unit === "byte" ? m.compare.byte : m.compare.bit} ${at}`;

/** your log row by row against the computed register, the first row that differs marked and its hints under the note. */
export function LogTable({ match, params }: Readonly<{ match: LogMatch; params: CrcParams }>) {
  const m = useMessages();
  const { width, xorout } = params;
  const diff = match.firstDiff === undefined ? undefined : match.rows[match.firstDiff]!;
  return (
    <div className="compare-result" data-result={match.firstDiff === undefined ? "ok" : "ng"}>
      {match.shift === "right" ? <p className="compare-note">{m.compare.rightShift}</p> : null}
      {diff === undefined ? null : (
        <>
          <p className="compare-note">
            {m.compare.firstDiff}: {rowName(m, match, diff.at)}
          </p>
          <HintList
            hints={[
              ...asHints(valueHints(diff.yours, diff.computed, width, xorout)),
              ...rowHints(match.rows, match.firstDiff!, width).map((side): Hint => ({ kind: "row", side })),
            ]}
          />
        </>
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

/** How your crc was read: one number as it is, or its numbers laid out as bytes and read in order. */
function readingText(m: Messages, read: CrcRead, element: Element, order: "be" | "le", width: number): string {
  if (read.bytes === undefined) return m.compare.readAs.one;
  const bytes = read.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
  const count = (read.bytes.length * 8) / element.bits;
  return m.compare.readAs.bytes(
    element.bits,
    count,
    element.bits === 8 ? undefined : element.order,
    bytes,
    order,
    valueHex(read.value, width),
  );
}

/** Hints 1 to 7 for your crc against computed, the CRC of bits over range; none when they are equal. */
function crcHints(params: CrcParams, bits: readonly Bit[], range: CrcRange | undefined, yours: bigint, computed: bigint): Hint[] {
  if (yours === computed) return [];
  const presets = presetHints(CATALOGUE, params, yours, (p) => crcOf(p.params, bits));
  return [
    ...asHints(valueHints(yours, computed, params.width, params.xorout)),
    ...(range ? rangeHints(params, range, yours).map((by): Hint => ({ kind: "range", by })) : []),
    ...(presets.length > 0 ? [{ kind: "preset", names: presets.map((p) => p.name) } as const] : []),
  ];
}

/**
 * The Visualizer's Compare section (spec chapter 16): your crc against the CRC of the range, and your log against the register
 * after each byte or bit. When the log differs, playback moves to the end of its first differing row.
 */
export function CompareSection({ params, steps, bits, range, form, onChange, onSeek }: Props) {
  const m = useMessages();
  const set = <K extends keyof CompareForm>(key: K, value: CompareForm[K]) => onChange({ ...form, [key]: value });
  const { width } = params;
  const computed = registerValue(steps.at(-1)!.reg);
  const crcArea = useReveal<HTMLDivElement>([form.crc, form.crcBase, form.crcElement, form.crcOrder]);
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
      <div ref={crcArea} className="compare-crc" data-reveal>
        <PasteField
          name="yourCrc"
          placeholder={m.compare.placeholders.crc}
          label="your crc"
          value={form.crc}
          onChange={(v) => set("crc", v)}
          badges={
            <>
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
            </>
          }
          error={crc && !crc.ok ? crc.error : undefined}
          note={
            crc?.ok ? (
              <small className="crc-reading">{readingText(m, crc.value, elementOf(form.crcElement), form.crcOrder, width)}</small>
            ) : null
          }
        />
        {crc?.ok ? (
          <ValueResult
            yours={crc.value.value}
            computed={computed}
            width={width}
            hints={crcHints(params, bits, range, crc.value.value, computed)}
          />
        ) : null}
      </div>
      <PasteField
        name="yourLog"
        placeholder={m.compare.placeholders.log}
        label="your log"
        value={form.log}
        onChange={(v) => set("log", v)}
        multiline
        badges={baseBadge("logBase")}
        error={log && !log.ok ? log.error : undefined}
      />
      {log?.ok ? <LogTable match={log.value} params={params} /> : null}
    </form>
  );
}
