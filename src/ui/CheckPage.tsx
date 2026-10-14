import { useState } from "react";
import { frame, recheck, wholeCheck } from "../domain/check";
import { crcOf } from "../domain/equivalence";
import type { ConfigResult } from "../domain/parse";
import type { Preset } from "../domain/presets";
import { flip, noError, xorBits } from "../domain/redundancy";
import { bitsFromBytes, toRegister, type Bit, type CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { toHex } from "./format";

const CHECK_INPUT = bitsFromBytes([...new TextEncoder().encode("123456789")]);

const hex = (value: number, width: number) => toHex(toRegister(value, width));

type Props = Readonly<{ config: ConfigResult; preset: Preset | undefined }>;

/** 受け取った側がどう確かめるかを、今の設定と入力で示す。設定が不正なら、そのことだけを出す。 */
export function CheckPage({ config, preset }: Props) {
  const m = useMessages();
  return (
    <div className="check-page">
      <h2>{m.check.heading}</h2>
      <p className="note">{m.check.note}</p>
      {config.ok ? (
        <Checks params={config.params} message={config.bits} preset={preset} />
      ) : (
        <p className="invalid-config">{m.settings.invalid}</p>
      )}
      <h3>{m.check.limitsSection}</h3>
      <ul className="check-limits">
        {m.check.limits.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  );
}

type ChecksProps = Readonly<{ params: CrcParams; message: readonly Bit[]; preset: Preset | undefined }>;

/** 送る並びと、ビットを反転して受け取った並びの 2 つの確かめ方、検査値。 */
function Checks({ params, message, preset }: ChecksProps) {
  const m = useMessages();
  const sent = frame(params, message);
  const [flips, setFlips] = useState<Bit[]>(() => noError(sent.length));
  const received = xorBits(sent, flips);
  const re = recheck(params, received, message.length);
  const whole = wholeCheck(params, received);
  const w = params.width;
  return (
    <>
      <h3>{m.check.frameSection}</h3>
      <p className="note">{m.check.frameNote}</p>
      <div className="frame-row">
        {received.map((bit, i) => (
          <button
            key={i}
            type="button"
            className={`bit-cell ${i < message.length ? "message" : "crc"} ${bit ? "one" : ""} ${flips[i] ? "flipped" : ""}`}
            data-index={i}
            onClick={() => setFlips(flip(flips, i))}
          >
            {bit}
          </button>
        ))}
      </div>
      <p className="frame-legend">
        <span className="part-label message">{m.check.message}</span>
        <span className="part-label crc">{m.check.crc}</span>
        <button type="button" className="reset-flips" onClick={() => setFlips(noError(sent.length))}>
          {m.check.reset}
        </button>
      </p>
      <h3>{m.check.methodsSection}</h3>
      <div className="methods">
        <section className="method" data-method="recheck">
          <h4>{m.check.recheck.title}</h4>
          <p className="note">{m.check.recheck.note}</p>
          <dl>
            <dt>{m.check.recheck.computed}</dt>
            <dd className="computed">{hex(re.computed, w)}</dd>
            <dt>{m.check.recheck.received}</dt>
            <dd className="received-crc">{hex(re.received, w)}</dd>
          </dl>
          <Verdict ok={re.ok} />
        </section>
        <section className="method" data-method="whole">
          <h4>{m.check.whole.title}</h4>
          <p className="note">{m.check.whole.note}</p>
          {whole ? (
            <>
              <dl>
                <dt>{m.check.whole.value}</dt>
                <dd className="whole-value">{hex(whole.value, w)}</dd>
                <dt>{m.check.whole.residue}</dt>
                <dd className="residue">{hex(whole.residue, w)}</dd>
              </dl>
              <Verdict ok={whole.ok} />
            </>
          ) : (
            <p className="not-applicable">{m.check.whole.notApplicable}</p>
          )}
        </section>
      </div>
      <p className="note">{m.check.sameVerdict}</p>
      <h3>{m.check.checkSection}</h3>
      <dl className="check-values">
        {preset ? (
          <>
            <dt>{m.check.catalogue}</dt>
            <dd className="catalogue-check">{hex(preset.check, w)}</dd>
          </>
        ) : null}
        <dt>{m.check.computedCheck}</dt>
        <dd className="computed-check">{hex(crcOf(params, CHECK_INPUT), w)}</dd>
      </dl>
      {preset ? null : <p className="note">{m.check.custom}</p>}
      <p className="note">{m.check.checkNote}</p>
    </>
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
