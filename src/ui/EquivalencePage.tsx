import { codeConstants, equivalences, initPrefix, shiftDirection, type Equivalence } from "../domain/equivalence";
import type { ConfigResult } from "../domain/parse";
import { reflectValue, toRegister, type CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { bitsToString, toHex } from "./format";

const hex = (value: number, width: number) => toHex(toRegister(value, width));

/** Lists the substitutions that give the same CRC and what can be inferred from what is known. Examples are computed from config (the current settings and input). */
export function EquivalencePage({ config }: Readonly<{ config: ConfigResult }>) {
  const m = useMessages();
  const e = m.equivalence;
  return (
    <div className="equivalence-page">
      <h2>{e.heading}</h2>
      <p className="note">{e.note}</p>
      {config.ok ? null : <p className="invalid-config">{m.settings.invalid}</p>}
      <h3>{e.sameSection}</h3>
      <div className="page-columns">
        {(config.ok ? equivalences(config.params, config.bits) : ITEM_IDS.map((id) => ({ id }))).map((item) => (
          <EquivalenceItem key={item.id} item={item} params={config.ok ? config.params : undefined} />
        ))}
      </div>
      <h3>{e.inferSection}</h3>
      <div className="inference-layout">
        <table className="inference">
          <thead>
            <tr>
              <th>{e.known}</th>
              <th>{e.follows}</th>
            </tr>
          </thead>
          <tbody>
            {e.rows.map((row) => (
              <tr key={row.known}>
                <td>{row.known}</td>
                <td>{row.follows}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {config.ok ? <CurrentInference params={config.params} /> : null}
      </div>
    </div>
  );
}

const ITEM_IDS = ["refin", "refout", "rightShift", "initPrefix", "affine"] as const;

type ItemProps = Readonly<{ item: Equivalence | Readonly<{ id: Equivalence["id"] }>; params: CrcParams | undefined }>;

/** One substitution. Shows the left side, right side and reason, and, if params is given, an example (or why it does not apply). */
function EquivalenceItem({ item, params }: ItemProps) {
  const m = useMessages();
  const e = m.equivalence;
  const text = e.items[item.id];
  const prefix = item.id === "initPrefix" && params ? initPrefix(params) : undefined;
  return (
    <section className="card equivalence-item" data-id={item.id}>
      <h4>{text.title}</h4>
      <dl>
        <dt>{e.left}</dt>
        <dd>
          <code>{text.left}</code>
        </dd>
        <dt>{e.right}</dt>
        <dd>{text.right}</dd>
        <dt>{e.why}</dt>
        <dd>{text.why}</dd>
      </dl>
      {params && "applicable" in item ? (
        item.applicable ? (
          <>
            <p className="example">
              {e.example}: <code className="left-value">{hex(item.left, params.width)}</code> ={" "}
              <code className="right-value">{hex(item.right, params.width)}</code>
              {item.left === item.right ? <span className="match">{e.match}</span> : null}
            </p>
            {prefix ? (
              <p className="example">
                {e.prefix} = <code className="prefix-value">{hex(parseInt(bitsToString(prefix), 2), params.width)}</code>
              </p>
            ) : null}
          </>
        ) : (
          <p className="not-applicable">{e.reasons[item.reason]}</p>
        )
      ) : null}
    </section>
  );
}

/** The shift direction under the current settings, and the poly and init written in implementation code. */
function CurrentInference({ params }: Readonly<{ params: CrcParams }>) {
  const e = useMessages().equivalence;
  const direction = shiftDirection(params);
  const constants = codeConstants(params);
  return (
    <div className="card current-inference">
      <h4>{e.current}</h4>
      <p className="current-direction" data-direction={direction}>
        {e.direction[direction]}
      </p>
      {direction === "mixed" ? null : (
        <p className="code-constants">{e.codeConstants(hex(constants.poly, params.width), hex(constants.init, params.width))}</p>
      )}
      {reflectValue(params.poly, params.width) & 1 ? <p className="note">{e.ambiguous}</p> : null}
    </div>
  );
}
