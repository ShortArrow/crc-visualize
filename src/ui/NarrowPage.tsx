import { branches, formatValue, matching, splittingParams, type NarrowPath } from "../domain/narrow";
import type { Preset } from "../domain/presets";
import { useMessages } from "../i18n/I18n";
import { narrowHash } from "./route";
import { Explanation } from "./Explanation";

type Props = Readonly<{
  presets: readonly Preset[];
  path: NarrowPath;
  onOpen: (preset: Preset) => void;
}>;

/** Tree that narrows the preset candidates to one by fixing values one at a time. path is already applied to presets. */
export function NarrowPage({ presets, path, onOpen }: Props) {
  const m = useMessages();
  return (
    <div className="narrow-page">
      <h2>{m.narrow.heading}</h2>
      <Explanation>{m.narrow.note}</Explanation>
      <NarrowNode presets={presets} path={path} depth={0} onOpen={onOpen} />
    </div>
  );
}

type NodeProps = Props & Readonly<{ depth: number }>;

/** The node at depth from the root. Shows the choice of parameter to split on and a branch per value, with the next node under the branch on the path. */
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
                {param === "refin" ? <span className="shift">{m.narrow.shift[branch.value ? "right" : "left"]}</span> : null}
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

/** Sidebar showing the fixed values and remaining candidates. A single remaining candidate can be opened in the visualization. */
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
