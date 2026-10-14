import { useState } from "react";
import { PARAM_NAMES, type ParamName } from "../domain/trace";
import { lfsrLayout, type Point } from "./layout";
import { XorGate } from "./LfsrView";
import { useMessages } from "../i18n/I18n";
import { namesHash } from "./route";

const layout = lfsrLayout({ width: 3, poly: 0b011 });
const { box, regY, streamY, gateR, inputGate: ig, feedbackBox: fb } = layout;
const STREAM = [1, 0, 1, 0, 1];
const STREAM_PITCH = 24;
const streamEnd = ig.x + (STREAM.length - 1) * STREAM_PITCH;
const rowLeft = layout.boxes[2]!.x;
const rowRight = layout.boxes[0]!.x + box;
const bracketY = regY - 26;
const outY = bracketY - 34;
const outEnd = layout.viewWidth + 90;
const viewWidth = outEnd + 40;
const CARD_WIDTH = 230;
const CARD_HEIGHT = 90;
const midY = regY + box / 2;
/** 右端のタップのゲート（引き出し線の始点）。 */
const rightGate = layout.gates.reduce((a, b) => (b.x > a.x ? b : a));
const toPoints = (points: readonly Point[]) => points.map((p) => `${p.x},${p.y}`).join(" ");

/** 引き出し線の先にパラメータ名を置く位置と、線の始点（効く場所）。 */
const CALLOUTS: Record<ParamName, Readonly<{ label: Point; from?: Point }>> = {
  refin: { label: { x: streamEnd + 56, y: streamY }, from: { x: streamEnd + 12, y: streamY - 5 } },
  width: { label: { x: rowLeft, y: bracketY - 8 } },
  init: { label: { x: layout.viewWidth + 12, y: regY + 6 }, from: { x: rowRight, y: regY + 6 } },
  poly: { label: { x: layout.viewWidth + 12, y: rightGate.y + 5 }, from: { x: rightGate.x + gateR, y: rightGate.y } },
  refout: { label: { x: rowRight + 40, y: outY - 8 } },
  xorout: { label: { x: rowRight + 130, y: outY - 8 } },
};

/**
 * パラメータ名の別名の図。固定の LFSR（width 3、poly 0x3）の各部から引き出し線を出してパラメータ名を書く。
 * パラメータ名にマウスを乗せると効く場所を強調して日本語名と別名の札を出し、選ぶと対応表のその行へ移る。
 */
export function ParamMap() {
  const [hovered, setHovered] = useState<ParamName | undefined>(undefined);
  const hl = (param: ParamName) => (hovered === param ? "param-hl" : "");
  return (
    <svg className="lfsr param-map" viewBox={`0 0 ${viewWidth} ${layout.viewHeight}`} data-hovered={hovered ?? ""}>
      <g className={`stream ${hl("refin")}`} data-param="refin">
        {STREAM.map((b, k) => (
          <text key={k} className="stream-bit" x={ig.x + k * STREAM_PITCH} y={streamY}>
            {b}
          </text>
        ))}
      </g>
      <polyline className="wire" points={toPoints(layout.inputRoute)} fill="none" />
      <polyline className="wire" points={toPoints(layout.msbRoute)} fill="none" />
      <polyline className="wire" points={toPoints(layout.resultRoute)} fill="none" />
      <line className="wire" x1={layout.entry(0).x} y1={midY} x2={rowRight} y2={midY} />
      {layout.boxes.slice(0, -1).map((b) => (
        <line key={b.bit} className="wire" x1={b.x} y1={midY} x2={b.x - layout.pitch + box} y2={midY} />
      ))}
      {layout.taps.map((i) => (
        <g key={i}>
          <polyline className={`wire ${hl("poly")}`} data-param="poly" points={toPoints(layout.tapRoute(i))} fill="none" />
          <polyline className="wire" points={toPoints(layout.tapInRoute(i))} fill="none" />
          <polyline className="wire" points={toPoints(layout.outRoute(i))} fill="none" />
        </g>
      ))}
      <XorGate at={ig} r={gateR} id="input" active={false} highlight={false} />
      <g className="fb-box" data-level="none" transform={`translate(${fb.x} ${fb.y})`}>
        <rect x={-fb.size / 2} y={-fb.size / 2} width={fb.size} height={fb.size} rx={5} />
      </g>
      {layout.gates.map((g) => (
        <XorGate key={g.bit} at={g} r={gateR} id={g.bit} active={false} highlight={hovered === "poly"} />
      ))}
      {layout.boxes.map(({ bit, x, y }) => (
        <g key={bit} className={`reg ${hl("init")} ${hl("width")}`} data-param="init width" transform={`translate(${x} ${y})`}>
          <rect width={box} height={box} rx={6} />
          <text className="reg-name" x={box / 2} y={-8}>
            r{bit}
          </text>
        </g>
      ))}

      <polyline
        className={`wire ${hl("width")}`}
        data-param="width"
        points={toPoints([
          { x: rowLeft, y: bracketY + 8 },
          { x: rowLeft, y: bracketY },
          { x: rowRight, y: bracketY },
          { x: rowRight, y: bracketY + 8 },
        ])}
        fill="none"
      />
      <polyline
        className={`wire output ${hl("refout")} ${hl("xorout")}`}
        data-param="refout xorout"
        points={toPoints([
          { x: (rowLeft + rowRight) / 2, y: bracketY },
          { x: (rowLeft + rowRight) / 2, y: outY },
          { x: outEnd, y: outY },
        ])}
        fill="none"
        markerEnd="url(#param-map-arrow)"
      />
      <text className="label" x={outEnd + 10} y={outY + 4}>
        CRC
      </text>
      <defs>
        <marker id="param-map-arrow" viewBox="0 0 8 8" refX={6} refY={4} markerWidth={8} markerHeight={8} orient="auto">
          <path d="M0,0 L8,4 L0,8 z" className="arrow-head" />
        </marker>
      </defs>

      {PARAM_NAMES.map((param) => {
        const { label, from } = CALLOUTS[param];
        return (
          <g key={param} className={`callout ${hovered === param ? "hovered" : ""}`} data-callout={param}>
            {from ? <line className="leader" x1={from.x} y1={from.y} x2={label.x - 4} y2={label.y - 5} /> : null}
            <a href={namesHash(param)} onMouseEnter={() => setHovered(param)} onMouseLeave={() => setHovered(undefined)}>
              <text className="callout-name" x={label.x} y={label.y}>
                {param}
              </text>
            </a>
          </g>
        );
      })}
      {hovered ? <HoverCard param={hovered} at={CALLOUTS[hovered].label} /> : null}
    </svg>
  );
}

/** パラメータ名に添える、表示言語での名前と別名の札。図の下半分にある名前では、はみ出さないよう名前の上に出す。 */
function HoverCard({ param, at }: { param: ParamName; at: Point }) {
  const m = useMessages();
  const info = m.params[param];
  const above = at.y > layout.viewHeight / 2;
  return (
    <foreignObject
      className={`hover-card ${above ? "above" : ""}`}
      x={Math.min(at.x - 8, viewWidth - CARD_WIDTH)}
      y={above ? at.y - 22 - CARD_HEIGHT : at.y + 8}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
    >
      <div className="card" data-param={param}>
        <strong>{info.title}</strong>
        <span>{info.aliases.join(m.listSeparator)}</span>
      </div>
    </foreignObject>
  );
}
