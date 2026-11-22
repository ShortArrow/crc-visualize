import { crcTable, tableDirection, type TableRun } from "./table";
import { bitEndStep, reflectValue, registerValue, type CrcParams, type Step } from "./trace";

/** The shift a register value is held by: left as the hardware model holds it, right reflected in width bits. */
export type Shift = "left" | "right";

/** One number of your log against the register at the same point; step is the step that ends there (0 for init). */
export type LogRow = Readonly<{ at: "init" | number; yours: bigint; computed: bigint; ok: boolean; step: number }>;

/** A log compared row by row, after each byte or each bit; firstDiff is the index of the first row that differs. */
export type LogMatch = Readonly<{ unit: "byte" | "bit"; shift: Shift; rows: readonly LogRow[]; firstDiff: number | undefined }>;

/** A log whose count fits neither the bytes nor the bits of the input; bytes is left out when the input is not whole bytes. */
export type LogError = Readonly<{ code: "logCount"; got: number; bytes?: number; bits: number }>;

/** A received frame pasted on the Check page that is shorter than the CRC; bytes is the least it can be. */
export type ReceivedError = Readonly<{ code: "receivedShort"; bytes: number }>;

/** A pasted table whose count is not 256. */
export type TableError = Readonly<{ code: "tableCount"; got: number }>;

/** A log on the Table page whose count is neither the bytes of the input nor one more. */
export type ByteLogError = Readonly<{ code: "byteLogCount"; got: number; bytes: number }>;

/** The errors of comparing pasted values beyond reading them. */
export type CompareError = LogError | ReceivedError | TableError | ByteLogError;

type Point = Readonly<{ at: "init" | number; step: number }>;

/** The points a log of count numbers stands for, or undefined when count fits none of n, n + 1, 8n and 8n + 1. */
function pointsOf(steps: readonly Step[], count: number): Readonly<{ unit: "byte" | "bit"; points: Point[] }> | undefined {
  const bits = steps[0]!.stream.length;
  const ends = (unit: "byte" | "bit", n: number, withInit: boolean) => ({
    unit,
    points: [
      ...(withInit ? [{ at: "init" as const, step: 0 }] : []),
      ...Array.from({ length: n }, (_, k) => ({ at: k, step: bitEndStep(steps, unit === "byte" ? 8 * k + 7 : k) })),
    ],
  });
  if (bits % 8 === 0 && (count === bits / 8 || count === bits / 8 + 1)) return ends("byte", bits / 8, count === bits / 8 + 1);
  if (count === bits || count === bits + 1) return ends("bit", bits, count === bits + 1);
  return undefined;
}

/**
 * Compares your log with the register of steps after each byte or bit, as spec chapter 16 says: its count tells which, and an
 * extra first number is init. With refin = refout = true it is compared as a right shift holds the register when its first number
 * matches that and not the left shift.
 */
export function matchLog(
  params: CrcParams,
  steps: readonly Step[],
  log: readonly bigint[],
): { ok: true; value: LogMatch } | { ok: false; error: LogError } {
  const bits = steps[0]!.stream.length;
  const found = pointsOf(steps, log.length);
  if (!found)
    return { ok: false, error: { code: "logCount", got: log.length, ...(bits % 8 === 0 ? { bytes: bits / 8 } : {}), bits } };
  const left = found.points.map((p) => registerValue(steps[p.step]!.reg));
  const right = left.map((v) => reflectValue(v, params.width));
  const shift: Shift = params.refin && params.refout && log[0] === right[0] && log[0] !== left[0] ? "right" : "left";
  const computed = shift === "right" ? right : left;
  const rows = found.points.map((p, i) => ({ ...p, yours: log[i]!, computed: computed[i]!, ok: log[i] === computed[i] }));
  const firstDiff = rows.findIndex((r) => !r.ok);
  return { ok: true, value: { unit: found.unit, shift, rows, firstDiff: firstDiff >= 0 ? firstDiff : undefined } };
}

/**
 * The input byte that holds the first row of match that differs, the row Per byte marks (spec chapter 16); undefined when every
 * row matches or the first that differs is init.
 */
export function diffByte(match: LogMatch): number | undefined {
  const at = match.firstDiff === undefined ? "init" : match.rows[match.firstDiff]!.at;
  if (at === "init") return undefined;
  return match.unit === "byte" ? at : Math.floor(at / 8);
}

/** How a constant pasted from code is written against the setting: as it is, reversed in width bits (a right-shift implementation), or neither. */
export type ConstantForm = "asIs" | "reversed" | "neither";

/** The form pasted is written in for setting in width bits; a setting that reads the same reversed counts as it is. */
export function constantForm(pasted: bigint, setting: bigint, width: number): ConstantForm {
  if (pasted === setting) return "asIs";
  return pasted === reflectValue(setting, width) ? "reversed" : "neither";
}

/**
 * A pasted table against table T of the shift it is closest to: firstDiff is undefined when every entry matches, otherwise the
 * first index that differs with the two values there.
 */
export type TableMatch = Readonly<{
  shift: Shift;
  firstDiff: Readonly<{ index: number; yours: bigint; computed: bigint }> | undefined;
}>;

/** Compares your table with table T as a left and as a right shift make it from params' poly; a tie goes to the left shift. */
export function matchTable(
  params: CrcParams,
  values: readonly bigint[],
): { ok: true; value: TableMatch } | { ok: false; error: TableError } {
  if (values.length !== 256) return { ok: false, error: { code: "tableCount", got: values.length } };
  const tables = {
    left: crcTable({ ...params, refin: false, refout: false }),
    right: crcTable({ ...params, refin: true, refout: true }),
  };
  const matching = (table: readonly bigint[]) => table.filter((v, i) => v === values[i]).length;
  const shift: Shift = matching(tables.right) > matching(tables.left) ? "right" : "left";
  const table = tables[shift];
  const index = table.findIndex((v, i) => v !== values[i]);
  return {
    ok: true,
    value: { shift, firstDiff: index < 0 ? undefined : { index, yours: values[index]!, computed: table[index]! } },
  };
}

/**
 * Compares your log with crc after each byte of the byte-at-a-time run, as spec chapter 16 says for the Table page: n numbers for
 * n bytes, or n + 1 starting with crc before the first byte. A row's step is the byte it ends.
 */
export function matchTableLog(
  params: CrcParams,
  run: TableRun,
  values: readonly bigint[],
): { ok: true; value: LogMatch } | { ok: false; error: ByteLogError } {
  const bytes = run.steps.length;
  if (values.length !== bytes && values.length !== bytes + 1)
    return { ok: false, error: { code: "byteLogCount", got: values.length, bytes } };
  const computed = [
    ...(values.length === bytes + 1 ? [{ at: "init" as const, value: run.start, step: 0 }] : []),
    ...run.steps.map((s, k) => ({ at: k, value: s.after, step: k })),
  ];
  const rows = computed.map(({ at, value, step }, i) => ({
    at,
    yours: values[i]!,
    computed: value,
    ok: values[i] === value,
    step,
  }));
  const first = rows.findIndex((r) => !r.ok);
  return {
    ok: true,
    value: { unit: "byte", shift: tableDirection(params), rows, firstDiff: first < 0 ? undefined : first },
  };
}
