import { useState } from "react";
import { crcOf } from "../domain/equivalence";
import type { ConfigResult } from "../domain/parse";
import { crcTable, entryClocks, tableDirection, tableRun, type TableDirection } from "../domain/table";
import { toRegister, type Bit, type CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { toHex } from "./format";

const hex = (value: number, width: number) => toHex(toRegister(value, width));
const byteHex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
const binary = (value: number, width: number) => value.toString(2).padStart(width, "0");
const NIBBLES = Array.from({ length: 16 }, (_, i) => i);

/** The byte-at-a-time table method for the current settings and input. If the settings are invalid, shows only that. */
export function TablePage({ config }: Readonly<{ config: ConfigResult }>) {
  const m = useMessages();
  return (
    <div className="table-page">
      <h2>{m.table.heading}</h2>
      <p className="note">{m.table.note}</p>
      {config.ok ? (
        <TableMethod params={config.params} bits={config.bits} />
      ) : (
        <p className="invalid-config">{m.settings.invalid}</p>
      )}
    </div>
  );
}

/** The update formula for direction, with the shift amounts and mask of width written out. */
function updateFormula(direction: TableDirection, width: number): string {
  if (direction === "right") return "crc = (crc >> 8) ^ T[(crc ^ byte) & 0xFF]";
  if (width < 8) return `crc = T[((crc << ${8 - width}) ^ byte) & 0xFF]`;
  return `crc = ((crc << 8) & ${hex(2 ** width - 1, width)}) ^ T[((crc >> ${width - 8}) ^ byte) & 0xFF]`;
}

type MethodProps = Readonly<{ params: CrcParams; bits: readonly Bit[] }>;

/** Table T, how the selected value is made, and the byte-at-a-time steps. A step or a table cell can be selected. */
function TableMethod({ params, bits }: MethodProps) {
  const m = useMessages();
  const t = m.table;
  const w = params.width;
  const direction = tableDirection(params);
  const table = crcTable(params);
  const run = tableRun(params, bits);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | undefined>(undefined);
  const used = run?.steps[step]?.index;
  const shown = picked ?? used ?? 0;
  return (
    <div className="page-columns">
      <section className="card">
        <h3>{t.stepsTitle}</h3>
        <p className="table-direction" data-direction={direction}>
          {t.direction[direction]}
        </p>
        {direction === "left" && (params.refin || params.refout) ? <p className="note">{t.reflectNote}</p> : null}
        <p>
          {t.formula}: <code className="update-formula">{updateFormula(direction, w)}</code>
        </p>
        {run ? (
          <>
            <table className="table-steps">
              <thead>
                <tr>
                  <th>{t.byte}</th>
                  <th>{t.before}</th>
                  <th>{t.index}</th>
                  <th>{t.entry}</th>
                  <th>{t.after}</th>
                </tr>
              </thead>
              <tbody>
                {run.steps.map((s, i) => (
                  <tr
                    key={i}
                    className={`step-row ${i === step ? "selected" : ""}`}
                    data-step={i}
                    data-index={s.index}
                    onClick={() => {
                      setStep(i);
                      setPicked(undefined);
                    }}
                  >
                    <td>{byteHex(s.byte)}</td>
                    <td>{hex(s.before, w)}</td>
                    <td>{byteHex(s.index)}</td>
                    <td>{hex(s.entry, w)}</td>
                    <td>{hex(s.after, w)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="table-totals">
              <dt>{t.start}</dt>
              <dd>{hex(run.start, w)}</dd>
              <dt>{t.result}</dt>
              <dd className="table-result">{hex(run.result, w)}</dd>
              <dt>{t.bitwise}</dt>
              <dd>
                <span className="bitwise-result">{hex(crcOf(params, bits), w)}</span>
                {run.result === crcOf(params, bits) ? <span className="match">{t.match}</span> : null}
              </dd>
            </dl>
          </>
        ) : (
          <p className="not-bytes">{t.notBytes}</p>
        )}
      </section>
      <section className="card">
        <h3>{t.tableTitle}</h3>
        <p className="note">{t.tableNote}</p>
        <div className="crc-table-scroll">
          <table className="crc-table">
            <thead>
              <tr>
                <th />
                {NIBBLES.map((lo) => (
                  <th key={lo}>{lo.toString(16).toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NIBBLES.map((hi) => (
                <tr key={hi}>
                  <th>{hi.toString(16).toUpperCase()}</th>
                  {NIBBLES.map((lo) => {
                    const i = hi * 16 + lo;
                    return (
                      <td
                        key={lo}
                        className={`table-cell ${i === used ? "used" : ""} ${i === shown ? "shown" : ""}`}
                        data-index={i}
                        onClick={() => setPicked(i)}
                      >
                        {hex(table[i]!, w).slice(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h3 className="entry-title">{t.entryTitle(byteHex(shown), hex(table[shown]!, w))}</h3>
        <p className="note">{t.entryNote[direction]}</p>
        <table className="entry-clocks">
          <thead>
            <tr>
              <th>{t.clock}</th>
              <th>{t.bit}</th>
              <th>{t.reg}</th>
            </tr>
          </thead>
          <tbody>
            {entryClocks(params, shown).map((c, k) => (
              <tr key={k}>
                <td>{k + 1}</td>
                <td>{c.bit}</td>
                <td>
                  <code>{binary(c.reg, w)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
