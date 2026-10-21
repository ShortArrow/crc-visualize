import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** The dock slot under the editor area, or null where there is none (anywhere but a phone). */
export const DockSlot = createContext<HTMLElement | null>(null);

type Props = Readonly<{
  /** Classes of the wrapper in the dock, such as the page's own class, so that the page's styles still reach the docked parts. */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}>;

/**
 * Parts that are tapped. On a phone, they are shown in the dock slot, between the editor area and the page links, inside a wrapper
 * with className and style (CSS custom properties are inherited along the DOM, not along React's tree). Elsewhere, they are shown in
 * place, without a wrapper.
 */
export function Docked({ className = "", style, children }: Props) {
  const slot = useContext(DockSlot);
  if (!slot) return <>{children}</>;
  return createPortal(
    <div className={`docked ${className}`} style={style}>
      {children}
    </div>,
    slot,
  );
}
