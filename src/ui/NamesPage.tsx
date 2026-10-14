import { useEffect, useRef } from "react";
import { AMBIGUOUS_NAMES, aliasIndex, polyFamilies, splitPresetName } from "../domain/naming";
import { CATALOGUE } from "../domain/presets";
import { PARAM_NAMES, type ParamName } from "../domain/trace";
import { ParamMap } from "./ParamMap";
import { PARAM_INFO } from "./paramInfo";

const EXAMPLE = "CRC-16/KERMIT";

/** 名前の規則のページの節。目次と各節の id に使う。 */
const SECTIONS = [
  { id: "names-parts", title: "名前の分解" },
  { id: "names-families", title: "同じ poly の一族" },
  { id: "names-aliases", title: "別名の対応表" },
  { id: "names-param-map", title: "パラメータ名の別名" },
  { id: "names-param-table", title: "パラメータ名の対応表" },
] as const;

/** サイドバーに置く目次。選ぶとエディタ領域のその節へ移る。フラグメントはページの切替に使うので変えない。 */
export function NamesToc() {
  return (
    <>
      <h2>目次</h2>
      <ul className="toc">
        {SECTIONS.map(({ id, title }) => (
          <li key={id}>
            <button type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ block: "start" })}>
              {title}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
const hexOf = (value: number, width: number) =>
  `0x${value
    .toString(16)
    .toUpperCase()
    .padStart(Math.ceil(width / 4), "0")}`;

/** プリセットの名前の付け方と、パラメータの呼び名の違いを示すページ。target は強調するパラメータの行。 */
export function NamesPage({ target }: { target: ParamName | undefined }) {
  return (
    <div className="names-page">
      <NameParts />
      <Families />
      <Aliases />
      <section className="pane" id="names-param-map">
        <h2>パラメータ名の別名</h2>
        <p className="note">名前にマウスを乗せると効く場所と別名を示し、選ぶと下の表のその行へ移ります。</p>
        <ParamMap />
      </section>
      <ParamTable target={target} />
    </div>
  );
}

function NameParts() {
  const { head, width, origin } = splitPresetName(EXAMPLE);
  return (
    <section className="pane name-parts" id="names-parts">
      <h2>名前の分解</h2>
      <div className="parts">
        <span className="part" data-part="head">
          <b>{head}</b>
          <small>巡回冗長検査</small>
        </span>
        <span className="sep">-</span>
        <span className="part" data-part="width">
          <b>{width}</b>
          <small>
            幅 <code>width</code>
          </small>
        </span>
        <span className="sep">/</span>
        <span className="part" data-part="origin">
          <b>{origin}</b>
          <small>最初に使われた規格・製品・団体などの名前</small>
        </span>
      </div>
      <p className="note">reveng カタログの正式名はこの形で、幅と後半の名前の組で 1 つの設定を指します。</p>
    </section>
  );
}

function Families() {
  return (
    <section className="pane families" id="names-families">
      <h2>
        同じ <code>poly</code> の一族
      </h2>
      <p className="note">
        幅と poly が同じでも、init・refin/refout・xorout の違いで別の CRC になります。一族の先頭と違う値を強調します。
      </p>
      {polyFamilies(CATALOGUE).map(({ width, poly, rows }) => (
        <table key={`${width}-${poly}`} className="family" data-poly={hexOf(poly, width)}>
          <caption>
            幅 {width}・poly {hexOf(poly, width)}
          </caption>
          <thead>
            <tr>
              <th>正式名</th>
              <th>init</th>
              <th>refin / refout</th>
              <th>xorout</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ preset, differs }) => (
              <tr key={preset.name} data-preset={preset.name}>
                <th>{preset.name}</th>
                <td className={differs.init ? "differs" : ""} data-col="init">
                  {hexOf(preset.params.init, width)}
                </td>
                <td className={differs.reflect ? "differs" : ""} data-col="reflect">
                  {String(preset.params.refin)} / {String(preset.params.refout)}
                </td>
                <td className={differs.xorout ? "differs" : ""} data-col="xorout">
                  {hexOf(preset.params.xorout, width)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </section>
  );
}

function Aliases() {
  return (
    <section className="pane aliases" id="names-aliases">
      <h2>別名の対応表</h2>
      <table className="ambiguous">
        <caption>流儀によって指すものが割れる呼び名</caption>
        <tbody>
          {AMBIGUOUS_NAMES.map(({ alias, candidates }) => (
            <tr key={alias} data-alias={alias}>
              <th>{alias}</th>
              <td>{candidates.join("、")} のどれか</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="alias-index">
        <thead>
          <tr>
            <th>別名</th>
            <th>正式名</th>
          </tr>
        </thead>
        <tbody>
          {aliasIndex(CATALOGUE).map(({ alias, name }) => (
            <tr key={alias} data-alias={alias}>
              <th>{alias}</th>
              <td>{name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ParamTable({ target }: { target: ParamName | undefined }) {
  const rows = useRef(new Map<ParamName, HTMLTableRowElement>());
  useEffect(() => {
    if (target) rows.current.get(target)?.scrollIntoView({ block: "center" });
  }, [target]);
  return (
    <section className="pane param-table" id="names-param-table">
      <h2>パラメータ名の対応表</h2>
      <table>
        <thead>
          <tr>
            <th>パラメータ名</th>
            <th>日本語名</th>
            <th>意味</th>
            <th>別名</th>
          </tr>
        </thead>
        <tbody>
          {PARAM_NAMES.map((param) => {
            const info = PARAM_INFO[param];
            return (
              <tr
                key={param}
                id={`param-${param}`}
                className={target === param ? "target" : ""}
                ref={(el) => {
                  if (el) rows.current.set(param, el);
                }}
              >
                <th>
                  <code>{param}</code>
                </th>
                <td>{info.title}</td>
                <td>{info.summary}</td>
                <td>{info.aliases.join("、")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
