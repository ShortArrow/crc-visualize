import { X } from "lucide-react";
import { registerValue, type CrcParams, type Step } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import type { Messages } from "../i18n/messages";
import { breakpointKey, editBreakpoint, hitsUpTo, type Breakpoint } from "../playback/breakpoints";
import { codeLines, type CodeLang } from "./code";

type Props = Readonly<{
  breakpoints: readonly Breakpoint[];
  params: CrcParams;
  steps: readonly Step[];
  index: number;
  lang: CodeLang;
  onChange: (breakpoints: Breakpoint[]) => void;
}>;

/** Hexadecimal value of byte k of the input as entered (before refin reflects it). */
const byteHex = (steps: readonly Step[], k: number) =>
  `0x${registerValue(steps[0]!.stream.slice(k * 8, k * 8 + 8).toReversed())
    .toString(16)
    .toUpperCase()
    .padStart(2, "0")}`;

/** Title of a breakpoint: a line's step kind, a byte's number and value as entered, or a bit's number and value as fed. */
function titleOf(m: Messages, bp: Breakpoint, steps: readonly Step[]): string {
  switch (bp.kind) {
    case "line":
      return m.steps[bp.runs];
    case "byte":
      return m.debug.byte(bp.byte, byteHex(steps, bp.byte));
    case "bit":
      return m.debug.bit(bp.bit, String(steps.at(-1)!.stream[bp.bit] ?? "—"));
  }
}

/**
 * The breakpoints set, each with a checkbox to enable it and a button to remove it. A line breakpoint shows its step kind and its
 * line in lang, a hit count field (empty to hit every time) and how many times its line has been reached up to steps[index].
 * A byte or bit breakpoint shows its number and value. Its buttons keep a phone's drawer open (data-stay).
 */
export function BreakpointList({ breakpoints, params, steps, index, lang, onChange }: Props) {
  const m = useMessages();
  if (breakpoints.length === 0) return <p className="bp-empty">{m.debug.empty}</p>;
  const lines = codeLines(params, steps[index]!, m, lang);
  const edit = (key: string, e: Parameters<typeof editBreakpoint>[2]) => onChange(editBreakpoint(breakpoints, key, e));
  return (
    <div className="breakpoints">
      <button type="button" className="bp-remove-all" data-stay onClick={() => onChange([])}>
        {m.debug.removeAll}
      </button>
      <ul className="bp-list">
        {breakpoints.map((bp) => {
          const key = breakpointKey(bp);
          return (
            <li key={key} className={`bp-entry ${bp.enabled ? "" : "off"}`} data-bp={key}>
              <label className="bp-title">
                <input
                  type="checkbox"
                  checked={bp.enabled}
                  title={m.debug.enabled}
                  onChange={(e) => edit(key, { enabled: e.target.checked })}
                />
                {titleOf(m, bp, steps)}
              </label>
              <button type="button" className="bp-remove" data-stay title={m.debug.remove} onClick={() => edit(key, "remove")}>
                <X size={14} />
              </button>
              {bp.kind === "line" ? (
                <>
                  <code className="bp-line">{lines.find((l) => l.runs === bp.runs)?.text.trim()}</code>
                  <input
                    className="bp-hit"
                    type="number"
                    min={1}
                    value={bp.hit ?? ""}
                    title={m.debug.hitCount}
                    aria-label={m.debug.hitCount}
                    placeholder={m.debug.hitCount}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      edit(key, { hit: Number.isInteger(n) && n >= 1 ? n : undefined });
                    }}
                  />
                  <span className="bp-hits">{m.debug.hits(hitsUpTo(steps, index, bp.runs))}</span>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
