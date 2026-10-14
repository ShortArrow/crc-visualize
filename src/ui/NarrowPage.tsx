import { branches, formatValue, matching, splittingParams, type NarrowPath } from "../domain/narrow";
import type { Preset } from "../domain/presets";
import { useMessages } from "../i18n/I18n";
import { narrowHash } from "./route";

type Props = Readonly<{
  presets: readonly Preset[];
  path: NarrowPath;
  onOpen: (preset: Preset) => void;
}>;

/** 値を 1 つずつ固定してプリセットの候補を 1 つに絞る木。path は presets に収めたもの。 */
export function NarrowPage({ presets, path, onOpen }: Props) {
  const m = useMessages();
  return (
    <div className="narrow-page">
      <h2>{m.narrow.heading}</h2>
      <p className="note">{m.narrow.note}</p>
      <NarrowNode presets={presets} path={path} depth={0} onOpen={onOpen} />
    </div>
  );
}

type NodeProps = Props & Readonly<{ depth: number }>;

/** 根から depth 番目の節。分けるパラメータの選択肢と、その値ごとの枝を出し、道筋の枝の先に次の節を出す。 */
function NarrowNode({ presets, path, depth, onOpen }: NodeProps) {
  const m = useMessages();
  const prefix = path.fixed.slice(0, depth);
  const candidates = matching(presets, prefix);
  const param = path.fixed[depth]?.param ?? (depth === path.fixed.length ? path.open : undefined);
  const [only] = candidates;
  if (candidates.length === 1 && only) {
    return (
      <div className="narrow-node narrow-result" data-depth={depth}>
        <span className="preset-name">{only.name}</span>
        <button type="button" className="narrow-open" onClick={() => onOpen(only)}>
          {m.narrow.open}
        </button>
      </div>
    );
  }
  return (
    <div className="narrow-node" data-depth={depth}>
      <span className="count">{m.narrow.candidates(candidates.length)}</span>
      <nav className="split-by">
        {m.narrow.splitBy}
        {splittingParams(candidates).map((p) => (
          <a key={p} href={narrowHash({ fixed: prefix, open: p })} data-param={p} aria-current={p === param ? "true" : undefined}>
            {p}
          </a>
        ))}
      </nav>
      {param ? (
        <ul className="branches" data-param={param}>
          {branches(candidates, param).map((branch) => {
            const text = formatValue(param, branch.value);
            const onPath = path.fixed[depth]?.value === branch.value;
            const [single] = branch.presets;
            return (
              <li key={text} className={`branch ${onPath ? "on-path" : ""}`} data-value={text}>
                <a href={narrowHash({ fixed: [...prefix, { param, value: branch.value }] })}>
                  {param} = {text}
                </a>
                <span className="count">{branch.presets.length}</span>
                {branch.presets.length === 1 && single && !onPath ? <span className="preset-name">{single.name}</span> : null}
                {onPath ? <NarrowNode presets={presets} path={path} depth={depth + 1} onOpen={onOpen} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** サイドバーに置く、固定した値と残りの候補。候補が 1 つなら可視化で開ける。 */
export function NarrowSidebar({ presets, path, onOpen }: Props) {
  const m = useMessages();
  const candidates = matching(presets, path.fixed);
  const [only] = candidates;
  return (
    <>
      <h2>{m.narrow.fixed}</h2>
      {path.fixed.length ? (
        <ul className="narrow-fixed">
          {path.fixed.map(({ param, value }) => (
            <li key={param}>
              {param} = {formatValue(param, value)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="note">{m.narrow.none}</p>
      )}
      <h2>{m.narrow.candidates(candidates.length)}</h2>
      <ul className="narrow-candidates">
        {candidates.map((p) => (
          <li key={p.name}>{p.name}</li>
        ))}
      </ul>
      {candidates.length === 1 && only ? (
        <button type="button" onClick={() => onOpen(only)}>
          {m.narrow.open}
        </button>
      ) : null}
    </>
  );
}
