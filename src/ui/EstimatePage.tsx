import { useEffect, useRef, useState } from "react";
import {
  MAX_BRUTE_WIDTH,
  bruteForce,
  catalogueByWidth,
  catalogueMatches,
  parseCrc,
  parseData,
  type BruteForce,
  type DataFormat,
  type Sample,
} from "../domain/estimate";
import { findPreset, type Preset } from "../domain/presets";
import { toRegister, type CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { toHex } from "./format";
import { Explanation } from "./Explanation";
import { PresetTable } from "./PresetTable";

/** A row of the form: data and CRC as typed. */
type Row = Readonly<{ data: string; crc: string }>;

/** Errors of a row: data that cannot be read, or a CRC that is unreadable or too wide. */
type RowErrors = Readonly<{ data?: boolean; crc?: boolean }>;

/** Results of a search: presets from the catalogue and the brute force. */
type Results = Readonly<{ catalogue: readonly Preset[]; brute: BruteForce }>;

/** Shown candidates of the brute force, at most. */
const SHOWN_CANDIDATES = 20;

const EMPTY_ROW: Row = { data: "", crc: "" };

const hex = (value: number, width: number) => toHex(toRegister(value, width));

/** width typed in the field if valid (1 to 32), otherwise the number of digits of the longest CRC × 4 (at most 32). */
function effectiveWidth(typed: string, rows: readonly Row[]): number {
  const n = Number(typed);
  if (/^\d+$/.test(typed.trim()) && n >= 1 && n <= 32) return n;
  const digits = Math.max(1, ...rows.map((r) => r.crc.trim().replace(/^0x/i, "").length));
  return Math.min(32, digits * 4);
}

type Props = Readonly<{
  onOpen: (params: CrcParams, input: Readonly<{ mode: DataFormat; text: string }>) => void;
  onCount: (count: number | undefined) => void;
}>;

/**
 * Pairs of data and CRC, the parameters found for them in the catalogue and by brute force, and the catalogue as a table with the
 * presets of the current width first; after a search the matching rows are green (class match), the other widths dimmed. The
 * results card is scrolled to its start when a search finishes and it is not wholly in view.
 */
export function EstimatePage({ onOpen, onCount }: Props) {
  const m = useMessages();
  const e = m.estimate;
  const [format, setFormat] = useState<DataFormat>("text");
  const [width, setWidth] = useState("");
  const [rows, setRows] = useState<readonly Row[]>([EMPTY_ROW, EMPTY_ROW]);
  const [errors, setErrors] = useState<readonly RowErrors[]>([]);
  const [results, setResults] = useState<Results | undefined>(undefined);
  const resultsCard = useRef<HTMLElement>(null);
  useEffect(() => {
    const box = resultsCard.current?.getBoundingClientRect();
    if (box && (box.top < 0 || box.bottom > window.innerHeight)) resultsCard.current?.scrollIntoView({ block: "start" });
  }, [results]);
  const w = effectiveWidth(width, rows);
  const edit = (i: number, row: Row) => setRows(rows.map((r, j) => (j === i ? row : r)));

  const search = () => {
    const filled = rows.map((row, i) => ({ row, i })).filter(({ row }) => row.data !== "" || row.crc !== "");
    const parsed = filled.map(({ row }) => ({ data: parseData(format, row.data), crc: parseCrc(row.crc, w) }));
    const found = rows.map((_, i) => {
      const k = filled.findIndex((f) => f.i === i);
      return k < 0 ? {} : { data: parsed[k]!.data === undefined, crc: parsed[k]!.crc === undefined };
    });
    setErrors(found);
    if (parsed.some((p) => p.data === undefined || p.crc === undefined) || parsed.length === 0) {
      setResults(undefined);
      onCount(undefined);
      return;
    }
    const samples: Sample[] = parsed.map((p) => ({ data: p.data!, crc: p.crc! }));
    const next = { catalogue: catalogueMatches(samples, w), brute: bruteForce(samples, w) };
    setResults(next);
    const keys = new Set(
      [...next.catalogue.map((p) => p.params), ...next.brute.candidates.map((c) => c.params)].map((p) => JSON.stringify(p)),
    );
    onCount(keys.size);
  };

  const firstInput = { mode: format, text: format === "hex" ? (rows[0]?.data ?? "").replace(/\s+/g, "") : (rows[0]?.data ?? "") };

  return (
    <div className="estimate-page">
      <h2>{e.heading}</h2>
      <Explanation>{e.note}</Explanation>
      <div className="page-columns">
        <section className="card estimate-input">
          <div className="estimate-options">
            <label>
              {e.format}{" "}
              <select className="data-format" value={format} onChange={(ev) => setFormat(ev.target.value as DataFormat)}>
                <option value="text">text</option>
                <option value="hex">hex</option>
              </select>
            </label>
            <label>
              {e.width}{" "}
              <input
                className="estimate-width"
                value={width}
                placeholder={String(w)}
                size={4}
                onChange={(ev) => setWidth(ev.target.value)}
              />
            </label>
            <span className="note">{e.widthAuto(w)}</span>
          </div>
          <table className="samples">
            <thead>
              <tr>
                <th>{e.data}</th>
                <th>{e.crc}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="sample-row" data-row={i}>
                  <td>
                    <input
                      className="sample-data"
                      value={row.data}
                      onChange={(ev) => edit(i, { ...row, data: ev.target.value })}
                    />
                    {errors[i]?.data ? <span className="field-error">{e.errors.notHex}</span> : null}
                  </td>
                  <td>
                    <input
                      className="sample-crc"
                      value={row.crc}
                      size={12}
                      onChange={(ev) => edit(i, { ...row, crc: ev.target.value })}
                    />
                    {errors[i]?.crc ? <span className="field-error">{e.errors.crc}</span> : null}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="remove-row"
                      title={e.removeRow}
                      aria-label={e.removeRow}
                      disabled={rows.length <= 1}
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="estimate-actions">
            <button type="button" className="add-row" onClick={() => setRows([...rows, EMPTY_ROW])}>
              {e.addRow}
            </button>
            <button type="button" className="run-search" onClick={search}>
              {e.search}
            </button>
          </div>
        </section>
        {results ? (
          <section className="card estimate-results" ref={resultsCard}>
            <h3>{e.catalogueTitle}</h3>
            {results.catalogue.length ? (
              <ul className="catalogue-matches">
                {results.catalogue.map((p) => (
                  <li key={p.name}>
                    {p.name}{" "}
                    <button type="button" onClick={() => onOpen(p.params, firstInput)}>
                      {e.open}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="note">{e.noCatalogue}</p>
            )}
            <BruteResults brute={results.brute} width={w} onOpen={(params) => onOpen(params, firstInput)} />
          </section>
        ) : null}
        <section className="card estimate-catalogue">
          <h3>{e.catalogueTable(w)}</h3>
          <PresetTable
            presets={catalogueByWidth(w)}
            rowClass={(p) =>
              [results?.catalogue.includes(p) ? "match" : "", p.params.width === w ? "" : "other-width"].filter(Boolean).join(" ")
            }
          />
          <p className="note">{m.presetCheckNote}</p>
        </section>
      </div>
    </div>
  );
}

type BruteProps = Readonly<{ brute: BruteForce; width: number; onOpen: (params: CrcParams) => void }>;

/** The brute-force state and up to SHOWN_CANDIDATES candidates, each with its official name if it is a preset. Placed in the results card below the catalogue matches. */
function BruteResults({ brute, width, onOpen }: BruteProps) {
  const m = useMessages();
  const e = m.estimate;
  const shown = brute.candidates.slice(0, SHOWN_CANDIDATES);
  const message = {
    ok: brute.candidates.length ? undefined : e.none,
    tooWide: e.tooWide(MAX_BRUTE_WIDTH),
    needPair: e.needPair,
  }[brute.status];
  return (
    <>
      <h3>{e.bruteTitle}</h3>
      <p className="brute-status note" data-status={brute.status}>
        {message}
      </p>
      {shown.some((c) => !c.initKnown) ? <p className="note">{e.initUnknown}</p> : null}
      {shown.length ? (
        <table className="candidates">
          <thead>
            <tr>
              <th>poly</th>
              <th>init</th>
              <th>refin</th>
              <th>refout</th>
              <th>xorout</th>
              <th>{m.presetName}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={JSON.stringify(c.params)}>
                <td>{hex(c.params.poly, width)}</td>
                <td>
                  {hex(c.params.init, width)}
                  {c.initKnown ? "" : " ?"}
                </td>
                <td>{String(c.params.refin)}</td>
                <td>{String(c.params.refout)}</td>
                <td>{hex(c.params.xorout, width)}</td>
                <td className="candidate-name">{findPreset(c.params)?.name ?? ""}</td>
                <td>
                  <button type="button" onClick={() => onOpen(c.params)}>
                    {e.open}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {brute.candidates.length > SHOWN_CANDIDATES ? (
        <p className="note">{e.more(brute.candidates.length - SHOWN_CANDIDATES)}</p>
      ) : null}
    </>
  );
}

/** Sidebar with hints on collecting pairs. */
export function EstimateSidebar() {
  const e = useMessages().estimate;
  return (
    <>
      <h2>{e.hintsTitle}</h2>
      <ul className="estimate-hints">
        {e.hints.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </ul>
    </>
  );
}
