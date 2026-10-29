import { useContext, useMemo, useState } from "react";
import { crcOf } from "../domain/equivalence";
import type { ConfigResult } from "../domain/parse";
import {
  crcTable,
  entryClocks,
  filledEntries,
  tableDirection,
  tablePlay,
  tableRun,
  type TableDirection,
  type TablePlayStep,
  type TableRun,
} from "../domain/table";
import { reflectValue, toRegister, type Bit, type CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import type { SpeedMode } from "../playback/playback";
import { tableStepDurations } from "../playback/tablePlayback";
import { usePlayer } from "../playback/usePlayer";
import { Controls } from "./Controls";
import { DockedResult, DockSlot } from "./Dock";
import { useRevealSpan } from "./reveal";
import { toHex } from "./format";
import { Explanation } from "./Explanation";

const hex = (value: number, width: number) => toHex(toRegister(value, width));
const byteHex = (value: number) => `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
const binary = (value: number, width: number) => value.toString(2).padStart(width, "0");
const NIBBLES = Array.from({ length: 16 }, (_, i) => i);

/** The playback settings shared with the Visualizer. */
export type PlaybackSettings = Readonly<{
  speedMode: SpeedMode;
  rate: number;
  loop: boolean;
  onSpeedMode: (mode: SpeedMode) => void;
  onRate: (rate: number) => void;
  onLoop: (loop: boolean) => void;
}>;

/** The byte-at-a-time table method for the current settings and input. If the settings are invalid, shows only that. */
export function TablePage({ config, playback }: Readonly<{ config: ConfigResult; playback: PlaybackSettings }>) {
  const m = useMessages();
  return (
    <div className="table-page">
      <h2>{m.table.heading}</h2>
      <Explanation>{m.table.note}</Explanation>
      {config.ok ? (
        <TableMethod params={config.params} bits={config.bits} playback={playback} />
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

/** Which parts of a byte's row are filled in: up to the index, up to the table value, or the whole row. */
type RowFill = "index" | "lookup" | "update";

/** What step shows of the byte-at-a-time computation: the rows filled in, and the byte being computed, if any. */
function bytesShown(step: TablePlayStep, run: TableRun | undefined): Readonly<{ rows: RowFill[]; byte: number | undefined }> {
  const count = run?.steps.length ?? 0;
  if (step.kind === "index" || step.kind === "lookup" || step.kind === "update") {
    return { rows: [...Array<RowFill>(step.byte).fill("update"), step.kind], byte: step.byte };
  }
  const making = step.kind === "start" || step.kind === "clock" || step.kind === "fill";
  return { rows: making ? [] : Array<RowFill>(count).fill("update"), byte: undefined };
}

/** The value of crc shown as the result at step: after the output reflection, after xorout, or none before them. */
function resultAt(step: TablePlayStep, params: CrcParams, run: TableRun): number | undefined {
  if (step.kind === "reflectOut") return reflectValue(run.steps.at(-1)?.after ?? run.start, params.width);
  return step.kind === "xorOut" || step.kind === "done" ? run.result : undefined;
}

/** The value whose making step shows when none is picked: the one being made or filled, or the one the byte uses. */
function entryAt(step: TablePlayStep, run: TableRun | undefined, row: number): number {
  if (step.kind === "clock" || step.kind === "fill") return step.entry;
  if (step.kind === "start") return 0;
  return run?.steps["byte" in step ? step.byte : row]?.index ?? 0;
}

type MethodProps = Readonly<{ params: CrcParams; bits: readonly Bit[]; playback: PlaybackSettings }>;

/**
 * Table T, how a value is made, and the byte-at-a-time steps, drawn at the step of playing the making and the use of the table.
 * While paused, a step row moves to the look-up of its byte, and a filled table cell shows how its value is made.
 */
function TableMethod({ params, bits, playback }: MethodProps) {
  const m = useMessages();
  const t = m.table;
  const w = params.width;
  const direction = tableDirection(params);
  const table = useMemo(() => crcTable(params), [params]);
  const run = useMemo(() => tableRun(params, bits), [params, bits]);
  const steps = useMemo(() => tablePlay(params, bits), [params, bits]);
  const { speedMode, rate, loop, onSpeedMode, onRate, onLoop } = playback;
  const durations = useMemo(() => tableStepDurations(steps, speedMode), [steps, speedMode]);
  const { player, send } = usePlayer({ run: "table", durations, rate, loop, onLoop, start: steps.length - 1 });
  const docking = useContext(DockSlot) !== null;
  const step = steps[player.index]!;
  const [row, setRow] = useState(0);
  const [picked, setPicked] = useState<Readonly<{ at: number; entry: number }> | undefined>(undefined);
  const [entryTitle, firstClock] = useRevealSpan<HTMLHeadingElement, HTMLTableRowElement>([picked]);
  const filled = filledEntries(step);
  const { rows, byte } = bytesShown(step, run);
  const current = byte ?? row;
  const looked = rows[current] === "lookup" || rows[current] === "update";
  const used = looked ? run?.steps[current]?.index : undefined;
  const indexing = byte !== undefined && rows[byte] === "index" ? run?.steps[byte]?.index : undefined;
  const shown = picked?.at === player.index ? picked.entry : entryAt(step, run, row);
  const clocks = entryClocks(params, shown).slice(0, step.kind === "clock" && step.entry === shown ? step.clock + 1 : 8);
  const result = run ? resultAt(step, params, run) : undefined;
  const choose = (i: number) => {
    setRow(i);
    send({ type: "seek", index: steps.findIndex((s) => s.kind === "lookup" && s.byte === i) });
  };
  const controls = (parts: "all" | "steps" | "rest") => (
    <Controls
      player={player}
      length={steps.length}
      speedMode={speedMode}
      rate={rate}
      loop={loop}
      send={send}
      onSpeedMode={onSpeedMode}
      onRate={onRate}
      onLoop={onLoop}
      parts={parts}
    />
  );
  return (
    <>
      {docking ? controls("rest") : controls("all")}
      <DockedResult className="table-page">
        <div className="dock-row">
          {controls("steps")}
          <p className="dock-result" data-dock-result>
            T[{byteHex(shown)}] = {hex(table[shown]!, w)}
          </p>
        </div>
      </DockedResult>
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
                  {rows.map((fill, i) => {
                    const s = run.steps[i]!;
                    return (
                      <tr
                        key={i}
                        className={`step-row ${i === current ? "selected" : ""}`}
                        data-step={i}
                        data-index={s.index}
                        onClick={() => choose(i)}
                      >
                        <td>{byteHex(s.byte)}</td>
                        <td>{hex(s.before, w)}</td>
                        <td>{byteHex(s.index)}</td>
                        <td>{fill === "index" ? "" : hex(s.entry, w)}</td>
                        <td>{fill === "update" ? hex(s.after, w) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <dl className="table-totals">
                <dt>{t.start}</dt>
                <dd>{hex(run.start, w)}</dd>
                <dt>{t.result}</dt>
                <dd className="table-result">{result === undefined ? "" : hex(result, w)}</dd>
                <dt>{t.bitwise}</dt>
                <dd>
                  {step.kind === "done" ? (
                    <>
                      <span className="bitwise-result">{hex(crcOf(params, bits), w)}</span>
                      {run.result === crcOf(params, bits) ? <span className="match">{t.match}</span> : null}
                    </>
                  ) : null}
                </dd>
              </dl>
            </>
          ) : (
            <p className="not-bytes">{t.notBytes}</p>
          )}
        </section>
        <section className="card">
          <h3>{t.tableTitle}</h3>
          <Explanation>{t.tableNote}</Explanation>
          <div className="crc-table-scroll">
            <table className="crc-table">
              <thead>
                <tr>
                  <th />
                  {NIBBLES.map((lo) => (
                    <th key={lo} className={indexing !== undefined && indexing % 16 === lo ? "index-heading" : undefined}>
                      {lo.toString(16).toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NIBBLES.map((hi) => (
                  <tr key={hi}>
                    <th className={indexing !== undefined && indexing >> 4 === hi ? "index-heading" : undefined}>
                      {hi.toString(16).toUpperCase()}
                    </th>
                    {NIBBLES.map((lo) => {
                      const i = hi * 16 + lo;
                      return (
                        <td
                          key={lo}
                          className={`table-cell ${i === used ? "used" : ""} ${i === shown ? "shown" : ""}`}
                          data-index={i}
                          onClick={() => (i < filled ? setPicked({ at: player.index, entry: i }) : undefined)}
                        >
                          {i < filled ? hex(table[i]!, w).slice(2) : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card entry-card">
          <div className="entry-text">
            <h3 className="entry-title" ref={entryTitle} data-reveal>
              {t.entryTitle(byteHex(shown), hex(table[shown]!, w))}
            </h3>
            <Explanation>{t.entryNote[direction]}</Explanation>
          </div>
          <div className="entry-clocks-scroll">
            <table className="entry-clocks">
              <thead>
                <tr>
                  <th>{t.clock}</th>
                  <th>{t.bit}</th>
                  <th>{t.feedback}</th>
                  <th>{t.shifted}</th>
                  <th>{t.xor}</th>
                  <th>{t.reg}</th>
                </tr>
              </thead>
              <tbody>
                {clocks.map((c, k) => (
                  <tr key={k} ref={k === 0 ? firstClock : undefined}>
                    <td>{k + 1}</td>
                    <td>{c.bit}</td>
                    <td>{c.feedback}</td>
                    <td>
                      <code>{binary(c.shifted, w)}</code>
                    </td>
                    <td>{c.feedback ? <code>{binary(c.xor, w)}</code> : t.noXor}</td>
                    <td>
                      <code>{binary(c.reg, w)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
