import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { crcLength, receivedMessageLength } from "../domain/check";
import type { CompareError } from "../domain/compare";
import { elementOf, readBytes, readValue, type Base, type ElementId, type PasteError } from "../domain/paste";
import { bitsFromBytes, type Bit, type CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { Badge, elementText, nextElement } from "./Badge";
import { PasteField, ValueResult } from "./PasteField";

/** What is pasted into the Compare cards of the pages other than the Visualizer; kept neither in the URL nor in storage. */
export type PageCompare = Readonly<{
  received: string;
  receivedBase: Base;
  receivedElement: ElementId;
  check: string;
  checkBase: Base;
}>;

export const EMPTY_PAGE_COMPARE: PageCompare = { received: "", receivedBase: 16, receivedElement: "8", check: "", checkBase: 16 };

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
}>;

/**
 * The Compare card of the Check page: a received frame that replaces the received sequence, and your check. It is folded to its
 * heading at first, so that the received sequence and both verdicts stay in view below it, and folds again once a paste reads.
 */
export function CheckCompare({ params, compare, onCompare, received, check }: CheckCompareProps) {
  const m = useMessages();
  const set = <K extends keyof PageCompare>(key: K, value: PageCompare[K]) => onCompare({ ...compare, [key]: value });
  const yours = compare.check.trim() === "" ? undefined : readValue(compare.check, compare.checkBase, params.width);
  const [open, setOpen] = useState(false);
  const pasted = useRef(false);
  const settled = (received !== undefined || yours !== undefined) && received?.ok !== false && yours?.ok !== false;
  useEffect(() => {
    if (pasted.current && settled) setOpen(false);
    pasted.current = false;
  }, [compare.received, compare.check]);
  const Chevron = open ? ChevronDown : ChevronRight;
  const base = (key: "receivedBase" | "checkBase") => (
    <Badge kind="base" name={m.badges.base} text={String(compare[key])} onPress={() => set(key, compare[key] === 16 ? 10 : 16)} />
  );
  return (
    <section className="card compare-card" data-open={String(open)}>
      <h3>
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Chevron size={14} />
          {m.compare.cardTitle}
          {yours?.ok ? <span className="compare-mark">{yours.value === check ? "✓" : "✗"}</span> : null}
        </button>
      </h3>
      {open ? (
        <form className="compare" onSubmit={(e) => e.preventDefault()} onPaste={() => (pasted.current = true)}>
          <PasteField
            name="received"
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
            label="your check"
            value={compare.check}
            onChange={(v) => set("check", v)}
            badges={base("checkBase")}
            error={yours && !yours.ok ? yours.error : undefined}
          />
          {yours?.ok ? <ValueResult yours={yours.value} computed={check} width={params.width} /> : null}
        </form>
      ) : null}
    </section>
  );
}
