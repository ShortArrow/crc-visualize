import { useEffect, useRef } from "react";
import { AMBIGUOUS_NAMES, aliasIndex, polyFamilies, splitPresetName } from "../domain/naming";
import { CATALOGUE } from "../domain/presets";
import { PARAM_NAMES, type ParamName } from "../domain/trace";
import { ParamMap } from "./ParamMap";
import { useMessages } from "../i18n/I18n";
import type { Messages } from "../i18n/messages";

const EXAMPLE = "CRC-16/KERMIT";

/** Section ids of the naming-rules page and their heading keys in the dictionary. Used for the table of contents and section ids. */
const SECTIONS: readonly Readonly<{ id: string; key: keyof Messages["names"]["sections"] }>[] = [
  { id: "names-parts", key: "parts" },
  { id: "names-families", key: "families" },
  { id: "names-aliases", key: "aliases" },
  { id: "names-param-map", key: "paramMap" },
  { id: "names-param-table", key: "paramTable" },
];

/** Table of contents for the sidebar. Selecting an entry moves the editor area to that section. Leaves the fragment unchanged, since it is used for page switching. */
export function NamesToc() {
  const m = useMessages();
  return (
    <>
      <h2>{m.names.toc}</h2>
      <ul className="toc">
        {SECTIONS.map(({ id, key }) => (
          <li key={id}>
            <button type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ block: "start" })}>
              {m.names.sections[key]}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
/** Wraps the identifier word in text with code, so heading capitalization does not affect the identifier. */
const withCode = (text: string, word: string) =>
  text.split(word).flatMap((part, i) => (i === 0 ? [part] : [<code key={i}>{word}</code>, part]));

const hexOf = (value: number, width: number) =>
  `0x${value
    .toString(16)
    .toUpperCase()
    .padStart(Math.ceil(width / 4), "0")}`;

/** Page showing how presets are named and how parameter names differ. target is the parameter row to highlight. */
export function NamesPage({ target }: { target: ParamName | undefined }) {
  const m = useMessages();
  return (
    <div className="names-page">
      <NameParts />
      <Families />
      <Aliases />
      <div className="page-columns names-params">
        <section className="pane" id="names-param-map">
          <h2>{m.names.sections.paramMap}</h2>
          <p className="note">{m.names.paramMap.note}</p>
          <ParamMap />
        </section>
        <ParamTable target={target} />
      </div>
    </div>
  );
}

function NameParts() {
  const m = useMessages();
  const { head, width, origin } = splitPresetName(EXAMPLE);
  return (
    <section className="pane name-parts" id="names-parts">
      <h2>{m.names.sections.parts}</h2>
      <div className="parts">
        <span className="part" data-part="head">
          <b>{head}</b>
          <small>{m.names.parts.head}</small>
        </span>
        <span className="sep">-</span>
        <span className="part" data-part="width">
          <b>{width}</b>
          <small>
            {m.names.parts.width} <code>width</code>
          </small>
        </span>
        <span className="sep">/</span>
        <span className="part" data-part="origin">
          <b>{origin}</b>
          <small>{m.names.parts.origin}</small>
        </span>
      </div>
      <p className="note">{m.names.parts.note}</p>
    </section>
  );
}

function Families() {
  const m = useMessages();
  return (
    <section className="pane families" id="names-families">
      <h2>{withCode(m.names.sections.families, "poly")}</h2>
      <p className="note">{m.names.families.note}</p>
      <div className="family-columns">
        {polyFamilies(CATALOGUE).map(({ width, poly, rows }) => (
          <table key={`${width}-${poly}`} className="family" data-poly={hexOf(poly, width)}>
            <caption>{m.names.families.caption(width, hexOf(poly, width))}</caption>
            <thead>
              <tr>
                <th>{m.names.families.name}</th>
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
      </div>
    </section>
  );
}

function Aliases() {
  const m = useMessages();
  return (
    <section className="pane aliases" id="names-aliases">
      <h2>{m.names.sections.aliases}</h2>
      <table className="ambiguous">
        <caption>{m.names.aliases.ambiguous}</caption>
        <tbody>
          {AMBIGUOUS_NAMES.map(({ alias, candidates }) => (
            <tr key={alias} data-alias={alias}>
              <th>{alias}</th>
              <td>{m.names.aliases.oneOf(candidates.join(m.listSeparator))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="alias-index">
        <thead>
          <tr>
            <th>{m.names.aliases.alias}</th>
            <th>{m.names.aliases.name}</th>
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
  const m = useMessages();
  const rows = useRef(new Map<ParamName, HTMLTableRowElement>());
  useEffect(() => {
    if (target) rows.current.get(target)?.scrollIntoView({ block: "center" });
  }, [target]);
  return (
    <section className="pane param-table" id="names-param-table">
      <h2>{m.names.sections.paramTable}</h2>
      <table>
        <thead>
          <tr>
            <th>{m.names.paramTable.param}</th>
            <th>{m.names.paramTable.title}</th>
            <th>{m.names.paramTable.meaning}</th>
            <th>{m.names.paramTable.aliases}</th>
          </tr>
        </thead>
        <tbody>
          {PARAM_NAMES.map((param) => {
            const info = m.params[param];
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
                <td>{info.aliases.join(m.listSeparator)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
