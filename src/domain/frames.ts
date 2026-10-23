import { crcOf } from "./equivalence";
import { bitsFromBytes, type CrcParams } from "./trace";

/** Whether a frame carries a CRC field right after the CRC range, and its byte order: be is high byte first, le low byte first. */
export type CrcField = "none" | "be" | "le";

export const CRC_FIELDS: readonly CrcField[] = ["none", "be", "le"];

/**
 * Where the CRC range lies in every frame, by byte number from 0. Without to, the range ends at the frame's last byte, or before
 * the CRC field when there is one, so frames of different lengths share one layout.
 */
export type FrameLayout = Readonly<{ from: number; to?: number; crcField: CrcField }>;

/** Byte numbers, both ends included, of the CRC range of one frame and of its CRC field if any. */
export type FrameSpan = Readonly<{ from: number; to: number; field?: Readonly<{ from: number; to: number }> }>;

/** A frame's CRC computed over its range, and the value in its CRC field if any; they agree when the frame is intact. */
export type FrameCheck = Readonly<{ span: FrameSpan; crc: number; field?: number }>;

/** Number of bytes of the CRC field: the CRC rounded up to whole bytes. */
const fieldBytes = (width: number) => Math.ceil(width / 8);

/** The span of layout in a frame of length bytes for a CRC of width bits, or undefined when the range or field does not fit. */
export function frameSpan(length: number, layout: FrameLayout, width: number): FrameSpan | undefined {
  const size = layout.crcField === "none" ? 0 : fieldBytes(width);
  const to = layout.to ?? length - 1 - size;
  if (layout.from > to || to + size >= length) return undefined;
  return size === 0 ? { from: layout.from, to } : { from: layout.from, to, field: { from: to + 1, to: to + size } };
}

/** Value of bytes read in byte order crcField. */
const readField = (bytes: readonly number[], crcField: CrcField) =>
  (crcField === "le" ? bytes.toReversed() : bytes).reduce((v, b) => v * 256 + b, 0);

/** Computes the CRC of frame's range and reads its CRC field; undefined when layout does not fit frame. */
export function checkFrame(params: CrcParams, frame: readonly number[], layout: FrameLayout): FrameCheck | undefined {
  const span = frameSpan(frame.length, layout, params.width);
  if (!span) return undefined;
  const crc = crcOf(params, bitsFromBytes(frame.slice(span.from, span.to + 1)));
  if (!span.field) return { span, crc };
  return { span, crc, field: readField(frame.slice(span.field.from, span.field.to + 1), layout.crcField) };
}
