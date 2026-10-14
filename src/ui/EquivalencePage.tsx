import { codeConstants, equivalences, initPrefix, shiftDirection, type Equivalence } from "../domain/equivalence";
import type { ConfigResult } from "../domain/parse";
import { reflectValue, toRegister, type CrcParams } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { bitsToString, toHex } from "./format";

const hex = (value: number, width: number) => toHex(toRegister(value, width));

/** 同じ CRC になる置き換えと、分かっていることから分かることの一覧。計算例は config（今の設定と入力）で求める。 */
export function EquivalencePage({ config }: Readonly<{ config: ConfigResult }>) {
  const m = useMessages();
  const e = m.equivalence;
  return (
    <div className="equivalence-page">
      <h2>{e.heading}</h2>
      <p className="note">{e.note}</p>
      {config.ok ? null : <p className="invalid-config">{m.settings.invalid}</p>}
      <h3>{e.sameSection}</h3>
      {(config.ok ? equivalences(config.params, config.bits) : ITEM_IDS.map((id) => ({ id }))).map((item) => (
        <EquivalenceItem key={item.id} item={item} params={config.ok ? config.params : undefined} />
      ))}
      <h3>{e.inferSection}</h3>
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
  );
}

const ITEM_IDS = ["refin", "refout", "rightShift", "initPrefix", "affine"] as const;

type ItemProps = Readonly<{ item: Equivalence | Readonly<{ id: Equivalence["id"] }>; params: CrcParams | undefined }>;

/** 1 つの置き換え。左辺・右辺・理由と、params があれば計算例（当てはまらなければその理由）を出す。 */
function EquivalenceItem({ item, params }: ItemProps) {
  const m = useMessages();
  const e = m.equivalence;
  const text = e.items[item.id];
  const prefix = item.id === "initPrefix" && params ? initPrefix(params) : undefined;
  return (
    <section className="equivalence-item" data-id={item.id}>
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

/** 今の設定での送り方と、実装のコードに書かれる poly と init。 */
function CurrentInference({ params }: Readonly<{ params: CrcParams }>) {
  const e = useMessages().equivalence;
  const direction = shiftDirection(params);
  const constants = codeConstants(params);
  return (
    <div className="current-inference">
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
