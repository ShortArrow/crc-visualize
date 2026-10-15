import type { Point } from "./layout";

/** Web Animations keyframes that follow the polyline points at constant speed. offset is the fraction of the path length from the start. */
export function routeKeyframes(points: readonly Point[]): Keyframe[] {
  const lengths = points.map((p, k) => (k === 0 ? 0 : Math.hypot(p.x - points[k - 1]!.x, p.y - points[k - 1]!.y)));
  const total = lengths.reduce((a, b) => a + b, 0);
  const frame = ({ x, y }: Point, offset: number): Keyframe => ({ transform: `translate(${x}px, ${y}px)`, offset });
  if (total === 0) return [frame(points[0]!, 0), frame(points[0]!, 1)];
  let walked = 0;
  return points.map((p, k) => frame(p, (walked += lengths[k]!) / total));
}
