import { ArrowDown } from "lucide-react";
import { useRef, useState } from "react";
import { frame, receivedMessageLength, recheck, wholeCheck } from "../domain/check";
import { crcOf } from "../domain/equivalence";
import type { ConfigResult } from "../domain/parse";
import type { Preset } from "../domain/presets";
import { flip, noError, xorBits } from "../domain/redundancy";
import { bitsFromBytes, type Bit, type CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { Docked, DockedResult } from "./Dock";
import { valueHex } from "./format";
import { Explanation } from "./Explanation";
import { CheckCompare, readReceived, type PageCompare } from "./pageCompare";

/** Brings the Compare card into view and puts the cursor in its first field. */
function toCard(card: HTMLElement | null) {
  card?.scrollIntoView({ block: "nearest" });
  card?.querySelector("input")?.focus({ preventScroll: true });
}

const CHECK_INPUT = bitsFromBytes([...new TextEncoder().encode("123456789")]);

type Props = Readonly<{
  config: ConfigResult;
  preset: Preset | undefined;
  /** What is pasted into the Compare card; it stays when the settings change. */
  compare: PageCompare;
  onCompare: (compare: PageCompare) => void;
}>;

/** Shows how the receiver checks, using the current settings and input. If the settings are invalid, shows only that. */
export function CheckPage({ config, preset, compare, onCompare }: Props) {
  const m = useMessages();
  const cardRef = useRef<HTMLElement>(null);
  const received = config.ok ? readReceived(config.params, compare) : undefined;
  return (
    <div className="check-page">
      <h2>
        {m.check.heading}
        {config.ok ? (
          <button type="button" className="compare-jump" onClick={() => toCard(cardRef.current)}>
            <ArrowDown size={14} />
            {m.compare.cardTitle}
          </button>
        ) : null}
      </h2>
      <Explanation>{m.check.note}</Explanation>
      {config.ok ? (
        <>
          <Checks
            key={received?.ok ? received.value.join("") : "sent"}
            params={config.params}
            message={config.bits}
            preset={preset}
            {...(received?.ok ? { received: received.value } : {})}
          />
          <CheckCompare
            ref={cardRef}
            params={config.params}
            compare={compare}
            onCompare={onCompare}
            received={received}
            check={crcOf(config.params, CHECK_INPUT)}
          />
        </>
      ) : (
        <>
          <p className="invalid-config">{m.settings.invalid}</p>
          <Limits />
        </>
      )}
    </div>
  );
}

type ChecksProps = Readonly<{
  params: CrcParams;
  message: readonly Bit[];
  preset: Preset | undefined;
  /** A pasted received frame, which replaces the sent sequence as the one whose bits can be flipped. */
  received?: readonly Bit[];
}>;

/** The two ways to check, on the sent sequence and on a received sequence with a flipped bit, and the check value. The sent sequence is docked. */
function Checks({ params, message, preset, received: pasted }: ChecksProps) {
  const m = useMessages();
  const sent = pasted ?? frame(params, message);
  const messageLength = pasted ? receivedMessageLength(params, pasted.length)! : message.length;
  const [stored, setFlips] = useState<Bit[]>(() => noError(sent.length));
  const flips = stored.length === sent.length ? stored : noError(sent.length);
  const received = xorBits(sent, flips);
  const re = recheck(params, received, messageLength);
  const whole = wholeCheck(params, received);
  const w = params.width;
  return (
    <>
      <h3>{m.check.frameSection}</h3>
      <p className="note">{m.check.frameNote}</p>
      <Docked className="check-page">
        <div className="frame-row">
          {received.map((bit, i) => (
            <button
              key={i}
              type="button"
              className={`bit-cell ${i < messageLength ? "message" : "crc"} ${i === messageLength ? "crc-start" : ""} ${bit ? "one" : ""} ${flips[i] ? "flipped" : ""}`}
              data-index={i}
              onClick={() => setFlips(flip(flips, i))}
            >
              {bit}
            </button>
          ))}
        </div>
      </Docked>
      <DockedResult className="check-page">
        <p className="verdict dock-result" data-dock-result data-ok={String(re.ok)}>
          {re.ok ? m.check.ok : m.check.ng}
        </p>
      </DockedResult>
      <ul className="frame-legend">
        <li data-key="message">
          <span className="bit-cell message">0</span>
          {m.check.message(messageLength)}
        </li>
        <li data-key="crc">
          <span className="bit-cell crc">0</span>
          {m.check.crc(sent.length - messageLength)}
        </li>
        <li data-key="values">
          <span className="bit-cell one">1</span>
          <span className="bit-cell">0</span>
          {m.check.values}
        </li>
        <li data-key="flipped">
          <span className="bit-cell flipped">0</span>
          {m.check.flipped}
        </li>
        <li>
          <button type="button" className="reset-flips" onClick={() => setFlips(noError(sent.length))}>
            {m.check.reset}
          </button>
        </li>
      </ul>
      <h3>{m.check.methodsSection}</h3>
      <Explanation>{m.check.sameVerdict}</Explanation>
      <div className="page-columns">
        <section className="card method" data-method="recheck">
          <h4>{m.check.recheck.title}</h4>
          <Explanation>{m.check.recheck.note}</Explanation>
          <dl>
            <dt>{m.check.recheck.computed}</dt>
            <dd className="computed">{valueHex(re.computed, w)}</dd>
            <dt>{m.check.recheck.received}</dt>
            <dd className="received-crc">{valueHex(re.received, w)}</dd>
          </dl>
          <Verdict ok={re.ok} />
        </section>
        <section className="card method" data-method="whole">
          <h4>{m.check.whole.title}</h4>
          <Explanation>{m.check.whole.note}</Explanation>
          {whole ? (
            <>
              <dl>
                <dt>{m.check.whole.value}</dt>
                <dd className="whole-value">{valueHex(whole.value, w)}</dd>
                <dt>{m.check.whole.residue}</dt>
                <dd className="residue">{valueHex(whole.residue, w)}</dd>
              </dl>
              <Verdict ok={whole.ok} />
            </>
          ) : (
            <p className="not-applicable">{m.check.whole.notApplicable}</p>
          )}
        </section>
      </div>
      <div className="page-columns">
        <section className="card">
          <h4>{m.check.checkSection}</h4>
          <dl className="check-values">
            {preset ? (
              <>
                <dt>{m.check.catalogue}</dt>
                <dd className="catalogue-check">{valueHex(preset.check, w)}</dd>
              </>
            ) : null}
            <dt>{m.check.computedCheck}</dt>
            <dd className="computed-check">{valueHex(crcOf(params, CHECK_INPUT), w)}</dd>
          </dl>
          {preset ? null : <p className="note">{m.check.custom}</p>}
          <Explanation>{m.check.checkNote}</Explanation>
        </section>
        <Limits />
      </div>
    </>
  );
}

/** What a CRC cannot check. */
function Limits() {
  const m = useMessages();
  return (
    <section className="card">
      <h4>{m.check.limitsSection}</h4>
      <ul className="check-limits">
        {m.check.limits.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </section>
  );
}

function Verdict({ ok }: Readonly<{ ok: boolean }>) {
  const m = useMessages();
  return (
    <p className="verdict" data-ok={String(ok)}>
      {ok ? m.check.ok : m.check.ng}
    </p>
  );
}
