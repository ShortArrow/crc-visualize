import type { ParamName } from "../domain/trace";

/** The parameter in focus. Shared by the settings panel, the pseudocode and the LFSR diagram to highlight where it is used. */
export type ParamFocus = Readonly<{
  focused: ParamName | undefined;
  onFocus: (param: ParamName | undefined) => void;
}>;

/** Attached to an element, focuses on param while the mouse or keyboard focus is on that element. */
export const focusHandlers = ({ onFocus }: ParamFocus, param: ParamName) => ({
  onMouseEnter: () => onFocus(param),
  onMouseLeave: () => onFocus(undefined),
  onFocus: () => onFocus(param),
  onBlur: () => onFocus(undefined),
});
