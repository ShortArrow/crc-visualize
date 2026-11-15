import { ELEMENT_IDS, type ElementId } from "../domain/paste";

/** The element badge choice after id, back to the first after the last. */
export const nextElement = (id: ElementId): ElementId => ELEMENT_IDS[(ELEMENT_IDS.indexOf(id) + 1) % ELEMENT_IDS.length]!;

/** How an element badge choice is written on the badge: 8, 16 BE, 16 LE and so on. */
export const elementText = (id: ElementId): string => (id === "8" ? id : `${id.slice(0, 2)} ${id.slice(2).toUpperCase()}`);

type BadgeProps = Readonly<{ kind: "base" | "element" | "order"; name: string; text: string; onPress: () => void }>;

/** A small button on a field that shows a reading choice and steps to the next one when pressed. */
export function Badge({ kind, name, text, onPress }: BadgeProps) {
  return (
    <button type="button" className="badge" data-badge={kind} aria-label={`${name} ${text}`} title={name} onClick={onPress}>
      {text}
    </button>
  );
}
