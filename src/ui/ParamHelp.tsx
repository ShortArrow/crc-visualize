import type { CrcParams, ParamName } from "../domain/trace";
import { PARAM_INFO, paramNotes } from "./paramInfo";

type Props = Readonly<{ focused: ParamName | undefined; params: CrcParams | undefined }>;

/** 注目中のパラメータの説明・別名・設定値に応じた注記。params が無い（設定が不正な）間は注記を省く。 */
export function ParamHelp({ focused, params }: Props) {
  if (focused === undefined) {
    return <div className="param-help idle">設定項目かコードのパラメータにマウスを乗せると、説明と別名を表示します。</div>;
  }
  const info = PARAM_INFO[focused];
  const notes = params ? paramNotes(focused, params) : [];
  return (
    <div className="param-help">
      <div className="param-help-head">
        <span className="param-help-title">{info.title}</span>
        <code className="param-name">{focused}</code>
        <span>{info.summary}</span>
      </div>
      <div className="param-help-aliases">別名: {info.aliases.join("、")}</div>
      {notes.map((note) => (
        <div key={note} className="param-help-note">
          {note}
        </div>
      ))}
    </div>
  );
}
