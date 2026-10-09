import type { ParamName } from "../domain/trace";

/** 注目中のパラメータ。設定パネル・擬似コード・LFSR 図で共有し、使用箇所を強調する。 */
export type ParamFocus = Readonly<{
  focused: ParamName | undefined;
  onFocus: (param: ParamName | undefined) => void;
}>;

/** 要素に付けると、マウスかキーボードのフォーカスが乗っている間 param に注目する。 */
export const focusHandlers = ({ onFocus }: ParamFocus, param: ParamName) => ({
  onMouseEnter: () => onFocus(param),
  onMouseLeave: () => onFocus(undefined),
  onFocus: () => onFocus(param),
  onBlur: () => onFocus(undefined),
});
