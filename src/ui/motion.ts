import type { Point } from "./layout";

/** 折れ線 points を一定の速さでたどる Web Animations のキーフレーム。offset は始点からの道のりの割合。 */
export function routeKeyframes(points: readonly Point[]): Keyframe[] {
  const lengths = points.map((p, k) => (k === 0 ? 0 : Math.hypot(p.x - points[k - 1]!.x, p.y - points[k - 1]!.y)));
  const total = lengths.reduce((a, b) => a + b, 0);
  const frame = ({ x, y }: Point, offset: number): Keyframe => ({ transform: `translate(${x}px, ${y}px)`, offset });
  if (total === 0) return [frame(points[0]!, 0), frame(points[0]!, 1)];
  let walked = 0;
  return points.map((p, k) => frame(p, (walked += lengths[k]!) / total));
}
