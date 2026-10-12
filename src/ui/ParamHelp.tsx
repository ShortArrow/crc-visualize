import type { ReactNode } from "react";
import { PARAM_NAMES, type CrcParams, type ParamName } from "../domain/trace";
import { FIELD_INFO, PARAM_INFO, paramNotes, type FieldName, type HelpTopic } from "./paramInfo";

type Props = Readonly<{ topic: HelpTopic | undefined; params: CrcParams | undefined }>;

const FIELD_NAMES = Object.keys(FIELD_INFO) as FieldName[];

const IDLE = "idle";

/**
 * 注目中の項目の日本語名と説明。パラメータなら別名と設定値に応じた注記も添え、params が無い（設定が不正な）間は注記を省く。
 * 全項目の説明を同じ位置に重ねて描き、注目中の 1 枚だけを見せる。
 * 欄の高さが最も長い説明に揃うので、横幅によらず見切れず、注目が変わっても高さが変わらない。
 */
export function ParamHelp({ topic, params }: Props) {
  const current = topic ?? IDLE;
  const page = (key: HelpTopic | typeof IDLE, content: ReactNode) => (
    <div key={key} className={key === current ? "current" : undefined} data-param={key} aria-hidden={key !== current}>
      {content}
    </div>
  );
  return (
    <div className={`param-help ${current === IDLE ? "idle" : ""}`}>
      {page(IDLE, "設定項目かコードのパラメータにマウスを乗せると、日本語名と説明を表示します。")}
      {PARAM_NAMES.map((param) => page(param, <ParamPage param={param} params={params} />))}
      {FIELD_NAMES.map((field) => page(field, <FieldPage field={field} />))}
    </div>
  );
}

function ParamPage({ param, params }: Readonly<{ param: ParamName; params: CrcParams | undefined }>) {
  const info = PARAM_INFO[param];
  const notes = params ? paramNotes(param, params) : [];
  return (
    <>
      <div className="param-help-head">
        <span className="param-help-title">{info.title}</span>
        <code className="param-name">{param}</code>
        <span>{info.summary}</span>
      </div>
      <div className="param-help-aliases">別名: {info.aliases.join("、")}</div>
      {notes.map((note) => (
        <div key={note} className="param-help-note">
          {note}
        </div>
      ))}
    </>
  );
}

function FieldPage({ field }: Readonly<{ field: FieldName }>) {
  const info = FIELD_INFO[field];
  return (
    <div className="param-help-head">
      <span className="param-help-title">{info.title}</span>
      <code className="param-name">{info.label}</code>
      <span>{info.summary}</span>
    </div>
  );
}
