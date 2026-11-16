import type { Ref } from "react";
import { crcLength, receivedMessageLength } from "../domain/check";
import { constantForm, matchTable, matchTableLog, type CompareError, type LogMatch, type TableMatch } from "../domain/compare";
import type { TableRun } from "../domain/table";
import { parseWidth, type ConfigError } from "../domain/parse";
import { checkHints, checkMatches, polyMatches } from "../domain/presetMatch";
import { asHints, presetHints, valueHints, type Hint } from "../domain/hints";
import { CATALOGUE, type Preset } from "../domain/presets";
import { elementOf, readBytes, readValue, readValues, type Base, type ElementId, type PasteError } from "../domain/paste";
import { bitsFromBytes, reflectValue, type Bit, type CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { Badge, elementText, nextElement } from "./Badge";
import { valueHex } from "./format";
import { LogTable } from "./CompareSection";
import { PasteField, ValueResult } from "./PasteField";

/** What is pasted into the Compare cards of the pages other than the Visualizer; kept neither in the URL nor in storage. */
export type PageCompare = Readonly<{
  received: string;
  receivedBase: Base;
  receivedElement: ElementId;
  check: string;
  checkBase: Base;
  /** your poly on the Naming page, and the width it is compared in (empty: every width). */
  poly: string;
  polyBase: Base;
  polyWidth: string;
  /** your check on the Narrow down page, apart from the Check page's, which is read in the settings' width. */
  narrowCheck: string;
  narrowCheckBase: Base;
  narrowWidth: string;
  /** your poly and your init on the Equivalences page, read in the settings' width. */
  eqPoly: string;
  eqPolyBase: Base;
  eqInit: string;
  eqInitBase: Base;
  /** your table on the Table page: 256 numbers in index order. */
  table: string;
  tableBase: Base;
  /** your log on the Table page: crc after each byte of the byte-at-a-time computation. */
  tableLog: string;
  tableLogBase: Base;
}>;

export const EMPTY_PAGE_COMPARE: PageCompare = {
  received: "",
  receivedBase: 16,
  receivedElement: "8",
  check: "",
  checkBase: 16,
  poly: "",
  polyBase: 16,
  polyWidth: "",
  narrowCheck: "",
  narrowCheckBase: 16,
  narrowWidth: "",
  eqPoly: "",
  eqPolyBase: 16,
  eqInit: "",
  eqInitBase: 16,
  table: "",
  tableBase: 16,
  tableLog: "",
  tableLogBase: 16,
};

type Read<T> = { ok: true; value: T } | { ok: false; error: PasteError | CompareError };

/** The received frame pasted on the Check page as bits, or undefined when nothing is pasted. It must hold the CRC at least. */
export function readReceived(params: CrcParams, compare: PageCompare): Read<Bit[]> | undefined {
  if (compare.received.trim() === "") return undefined;
  const read = readBytes(compare.received, compare.receivedBase, elementOf(compare.receivedElement));
  if (!read.ok) return read;
  const bits = bitsFromBytes(read.value.flat());
  if (receivedMessageLength(params, bits.length) === undefined) {
    return { ok: false, error: { code: "receivedShort", bytes: Math.ceil(crcLength(params) / 8) } };
  }
  return { ok: true, value: bits };
}

type CheckCompareProps = Readonly<{
  params: CrcParams;
  compare: PageCompare;
  onCompare: (compare: PageCompare) => void;
  received: Read<Bit[]> | undefined;
  /** The CRC of 123456789 with the current settings. */
  check: bigint;
  /** Where the button beside the page heading moves to. */
  ref?: Ref<HTMLElement>;
}>;

/** Hints 1 to 5 and 7 for your check against check, the CRC of 123456789; none when they are equal. */
function checkHintsOf(params: CrcParams, yours: bigint, check: bigint): Hint[] {
  if (yours === check) return [];
  const presets = presetHints(CATALOGUE, params, yours, (p) => p.check);
  return [
    ...asHints(valueHints(yours, check, params.width, params.xorout)),
    ...(presets.length > 0 ? [{ kind: "preset", names: presets.map((p) => p.name) } as const] : []),
  ];
}

/** The Compare card of the Check page: a received frame that replaces the received sequence, and your check. It comes after both verdicts. */
export function CheckCompare({ params, compare, onCompare, received, check, ref }: CheckCompareProps) {
  const m = useMessages();
  const set = <K extends keyof PageCompare>(key: K, value: PageCompare[K]) => onCompare({ ...compare, [key]: value });
  const yours = compare.check.trim() === "" ? undefined : readValue(compare.check, compare.checkBase, params.width);
  const base = (key: "receivedBase" | "checkBase") => (
    <Badge kind="base" name={m.badges.base} text={String(compare[key])} onPress={() => set(key, compare[key] === 16 ? 10 : 16)} />
  );
  return (
    <section ref={ref} className="card compare-card">
      <h3>{m.compare.cardTitle}</h3>
      <form className="compare" onSubmit={(e) => e.preventDefault()}>
        <PasteField
          name="received"
          placeholder={m.compare.placeholders.received}
          label="received"
          value={compare.received}
          onChange={(v) => set("received", v)}
          badges={
            <>
              {base("receivedBase")}
              <Badge
                kind="element"
                name={m.badges.element}
                text={elementText(compare.receivedElement)}
                onPress={() => set("receivedElement", nextElement(compare.receivedElement))}
              />
            </>
          }
          error={received && !received.ok ? received.error : undefined}
        />
        <PasteField
          name="yourCheck"
          placeholder={m.compare.placeholders.check}
          label="your check"
          value={compare.check}
          onChange={(v) => set("check", v)}
          badges={base("checkBase")}
          error={yours && !yours.ok ? yours.error : undefined}
        />
        {yours?.ok ? (
          <ValueResult
            yours={yours.value}
            computed={check}
            width={params.width}
            hints={checkHintsOf(params, yours.value, check)}
          />
        ) : null}
      </form>
    </section>
  );
}

type PresetCompareProps = Readonly<{
  presets: readonly Preset[];
  compare: PageCompare;
  onCompare: (compare: PageCompare) => void;
}>;

/** A width field: undefined when empty (every width), otherwise the width or the error under it. */
function readWidth(text: string): { ok: true; value: number | undefined } | { ok: false; error: ConfigError } {
  return text.trim() === "" ? { ok: true, value: undefined } : parseWidth(text);
}

/** The official names of presets after ✓, or ✗ with no names when there are none. */
function PresetNames({ presets }: Readonly<{ presets: readonly Preset[] }>) {
  const m = useMessages();
  return presets.length > 0 ? (
    <p className="compare-result ok" data-result="ok">
      ✓ {presets.map((p) => p.name).join(", ")}
    </p>
  ) : (
    <p className="compare-result ng" data-result="ng">
      ✗ {m.compare.none}
    </p>
  );
}

/** A value pasted with the width it is compared in, and the badge and error of each. */
function ValueWithWidth({
  name,
  placeholder,
  value,
  base,
  width,
  onValue,
  onBase,
  onWidth,
  valueError,
  widthError,
}: Readonly<{
  name: string;
  /** The example shown in the value field while it is empty. */
  placeholder: string;
  value: string;
  base: Base;
  width: string;
  onValue: (v: string) => void;
  onBase: () => void;
  onWidth: (v: string) => void;
  valueError: PasteError | undefined;
  widthError: ConfigError | undefined;
}>) {
  const m = useMessages();
  return (
    <>
      <PasteField
        name={name}
        placeholder={placeholder}
        label={name}
        value={value}
        onChange={onValue}
        badges={<Badge kind="base" name={m.badges.base} text={String(base)} onPress={onBase} />}
        error={valueError}
      />
      <PasteField
        name="width"
        label="width"
        value={width}
        onChange={onWidth}
        placeholder={m.compare.placeholders.width}
        badges={null}
        error={widthError}
      />
    </>
  );
}

/** The Compare card of the Naming page: your poly against the presets' poly, then in the other notations when none matches. */
export function NamingCompare({ presets, compare, onCompare }: PresetCompareProps) {
  const m = useMessages();
  const set = <K extends keyof PageCompare>(key: K, value: PageCompare[K]) => onCompare({ ...compare, [key]: value });
  const width = readWidth(compare.polyWidth);
  const read =
    compare.poly.trim() === "" || !width.ok ? undefined : readValue(compare.poly, compare.polyBase, (width.value ?? 64) + 1);
  const match = read?.ok ? polyMatches(presets, read.value, width.ok ? width.value : undefined) : undefined;
  return (
    <section className="card compare-card">
      <h3>{m.compare.cardTitle}</h3>
      <form className="compare" onSubmit={(e) => e.preventDefault()}>
        <ValueWithWidth
          name="your poly"
          placeholder={m.compare.placeholders.poly}
          value={compare.poly}
          base={compare.polyBase}
          width={compare.polyWidth}
          onValue={(v) => set("poly", v)}
          onBase={() => set("polyBase", compare.polyBase === 16 ? 10 : 16)}
          onWidth={(v) => set("polyWidth", v)}
          valueError={read && !read.ok ? read.error : undefined}
          widthError={width.ok ? undefined : width.error}
        />
        {match ? (
          <div className="compare-result-list">
            <PresetNames presets={match.normal} />
            {match.others.map(({ notation, presets: matched }) => (
              <p key={notation} className="compare-hint" data-notation={notation}>
                {m.compare.notations[notation]}: {matched.map((p) => p.name).join(", ")}
              </p>
            ))}
          </div>
        ) : null}
      </form>
    </section>
  );
}

/** The presets whose check is value, or when none is, ✗ followed by each hint that some preset would match, with those presets. */
function CheckResult({
  presets,
  value,
  width,
}: Readonly<{ presets: readonly Preset[]; value: bigint; width: number | undefined }>) {
  const m = useMessages();
  const exact = checkMatches(presets, value, width);
  return (
    <div className="compare-result-list">
      <PresetNames presets={exact} />
      {exact.length > 0
        ? null
        : checkHints(presets, value, width).map(({ hint, presets: matched }) => (
            <p key={hint} className="compare-hint" data-hint={hint}>
              {m.compare.hints[hint]}: {matched.map((p) => p.name).join(", ")}
            </p>
          ))}
    </div>
  );
}

/** The Compare card of the Narrow down page: your check against the check of the presets, then under hints 1 to 5. */
export function NarrowCompare({ presets, compare, onCompare }: PresetCompareProps) {
  const m = useMessages();
  const set = <K extends keyof PageCompare>(key: K, value: PageCompare[K]) => onCompare({ ...compare, [key]: value });
  const width = readWidth(compare.narrowWidth);
  const read =
    compare.narrowCheck.trim() === "" || !width.ok
      ? undefined
      : readValue(compare.narrowCheck, compare.narrowCheckBase, width.value ?? 64);
  return (
    <section className="card compare-card">
      <h3>{m.compare.cardTitle}</h3>
      <form className="compare" onSubmit={(e) => e.preventDefault()}>
        <ValueWithWidth
          name="your check"
          placeholder={m.compare.placeholders.check}
          value={compare.narrowCheck}
          base={compare.narrowCheckBase}
          width={compare.narrowWidth}
          onValue={(v) => set("narrowCheck", v)}
          onBase={() => set("narrowCheckBase", compare.narrowCheckBase === 16 ? 10 : 16)}
          onWidth={(v) => set("narrowWidth", v)}
          valueError={read && !read.ok ? read.error : undefined}
          widthError={width.ok ? undefined : width.error}
        />
        {read?.ok ? <CheckResult presets={presets} value={read.value} width={width.ok ? width.value : undefined} /> : null}
      </form>
    </section>
  );
}

/** One constant pasted on the Equivalences page, against its setting: ✓ as it is or reversed, or ✗ with both forms written out. */
function ConstantField({
  name,
  placeholder,
  value,
  base,
  setting,
  width,
  onValue,
  onBase,
}: Readonly<{
  name: string;
  placeholder: string;
  value: string;
  base: Base;
  setting: bigint;
  width: number;
  onValue: (v: string) => void;
  onBase: () => void;
}>) {
  const m = useMessages();
  const read = value.trim() === "" ? undefined : readValue(value, base, width);
  const form = read?.ok ? constantForm(read.value, setting, width) : undefined;
  return (
    <>
      <PasteField
        name={name}
        label={name}
        value={value}
        onChange={onValue}
        placeholder={placeholder}
        badges={<Badge kind="base" name={m.badges.base} text={String(base)} onPress={onBase} />}
        error={read && !read.ok ? read.error : undefined}
      />
      {form ? (
        <p
          className="compare-result constant-result"
          data-field={name}
          data-form={form}
          data-result={form === "neither" ? "ng" : "ok"}
        >
          {form === "neither"
            ? `✗ ${m.compare.forms.neither(valueHex(setting, width), valueHex(reflectValue(setting, width), width))}`
            : `✓ ${m.compare.forms[form]}`}
        </p>
      ) : null}
    </>
  );
}

/** The Compare card of the Equivalences page: your poly and your init against the settings' poly and init. */
export function EquivalenceCompare({
  params,
  compare,
  onCompare,
}: Readonly<{ params: CrcParams; compare: PageCompare; onCompare: (compare: PageCompare) => void }>) {
  const m = useMessages();
  const set = <K extends keyof PageCompare>(key: K, value: PageCompare[K]) => onCompare({ ...compare, [key]: value });
  return (
    <section className="card compare-card">
      <h3>{m.compare.cardTitle}</h3>
      <form className="compare" onSubmit={(e) => e.preventDefault()}>
        <ConstantField
          name="your poly"
          placeholder={m.compare.placeholders.poly}
          value={compare.eqPoly}
          base={compare.eqPolyBase}
          setting={params.poly}
          width={params.width}
          onValue={(v) => set("eqPoly", v)}
          onBase={() => set("eqPolyBase", compare.eqPolyBase === 16 ? 10 : 16)}
        />
        <ConstantField
          name="your init"
          placeholder={m.compare.placeholders.init}
          value={compare.eqInit}
          base={compare.eqInitBase}
          setting={params.init}
          width={params.width}
          onValue={(v) => set("eqInit", v)}
          onBase={() => set("eqInitBase", compare.eqInitBase === 16 ? 10 : 16)}
        />
      </form>
    </section>
  );
}

/** your table read and compared with table T of each shift, or undefined when nothing is pasted. */
export function readTable(params: CrcParams, compare: PageCompare): Read<TableMatch> | undefined {
  if (compare.table.trim() === "") return undefined;
  const values = readValues(compare.table, compare.tableBase, params.width);
  return values.ok ? matchTable(params, values.value) : values;
}

/** your log on the Table page read and compared with run, or undefined when nothing is pasted or the input is not whole bytes. */
export function readTableLog(params: CrcParams, run: TableRun | undefined, compare: PageCompare): Read<LogMatch> | undefined {
  if (compare.tableLog.trim() === "" || !run) return undefined;
  const values = readValues(compare.tableLog, compare.tableLogBase, params.width);
  return values.ok ? matchTableLog(params, run, values.value) : values;
}

/**
 * The Compare card of the Table page: your table against table T for a left and for a right shift, and your log against crc
 * after each byte, the latter while the input is whole bytes.
 */
export function TableCompare({
  params,
  compare,
  onCompare,
  read,
  log,
  bytes,
}: Readonly<{
  params: CrcParams;
  compare: PageCompare;
  onCompare: (compare: PageCompare) => void;
  read: Read<TableMatch> | undefined;
  log: Read<LogMatch> | undefined;
  /** Whether the input is whole bytes, so that a log of the byte-at-a-time computation can be compared. */
  bytes: boolean;
}>) {
  const m = useMessages();
  const set = <K extends keyof PageCompare>(key: K, value: PageCompare[K]) => onCompare({ ...compare, [key]: value });
  const match = read?.ok ? read.value : undefined;
  return (
    <section className="card compare-card">
      <h3>{m.compare.cardTitle}</h3>
      <form className="compare" onSubmit={(e) => e.preventDefault()}>
        <PasteField
          name="yourTable"
          label="your table"
          value={compare.table}
          onChange={(v) => set("table", v)}
          placeholder={m.compare.placeholders.table}
          multiline
          badges={
            <Badge
              kind="base"
              name={m.badges.base}
              text={String(compare.tableBase)}
              onPress={() => set("tableBase", compare.tableBase === 16 ? 10 : 16)}
            />
          }
          error={read && !read.ok ? read.error : undefined}
        />
        {match ? (
          match.firstDiff === undefined ? (
            <p className="compare-result ok table-result" data-result="ok" data-shift={match.shift}>
              ✓ {m.compare.table[match.shift]}
            </p>
          ) : (
            <div className="table-result" data-result="ng" data-shift={match.shift} data-index={match.firstDiff.index}>
              <p className="compare-result ng">
                ✗ {m.compare.table.closest(match.shift, `0x${match.firstDiff.index.toString(16).toUpperCase().padStart(2, "0")}`)}
              </p>
              <ValueResult
                yours={match.firstDiff.yours}
                computed={match.firstDiff.computed}
                width={params.width}
                hints={asHints(valueHints(match.firstDiff.yours, match.firstDiff.computed, params.width, undefined))}
              />
            </div>
          )
        ) : null}
        {bytes ? (
          <PasteField
            name="yourLog"
            label="your log"
            value={compare.tableLog}
            onChange={(v) => set("tableLog", v)}
            placeholder={m.compare.placeholders.log}
            multiline
            badges={
              <Badge
                kind="base"
                name={m.badges.base}
                text={String(compare.tableLogBase)}
                onPress={() => set("tableLogBase", compare.tableLogBase === 16 ? 10 : 16)}
              />
            }
            error={log && !log.ok ? log.error : undefined}
          />
        ) : null}
        {log?.ok ? <LogTable match={log.value} params={params} /> : null}
      </form>
    </section>
  );
}
