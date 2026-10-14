import type { ReactNode } from "react";
import { PARAM_NAMES, type CrcParams, type ParamName } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { FIELD_LABELS, paramNotes, type FieldName, type HelpTopic } from "./paramInfo";

type Props = Readonly<{ topic: HelpTopic | undefined; params: CrcParams | undefined }>;

const FIELD_NAMES = Object.keys(FIELD_LABELS) as FieldName[];

const IDLE = "idle";

/**
 * 注目中の項目の名前と説明（表示言語で書く）。パラメータなら別名と設定値に応じた注記も添え、params が無い（設定が不正な）間は注記を省く。
 * 全項目の説明を同じ位置に重ねて描き、注目中の 1 枚だけを見せる。
 * 欄の高さが最も長い説明に揃うので、横幅によらず見切れず、注目が変わっても高さが変わらない。
 */
export function ParamHelp({ topic, params }: Props) {
  const m = useMessages();
  const current = topic ?? IDLE;
  const page = (key: HelpTopic | typeof IDLE, content: ReactNode) => (
    <div key={key} className={key === current ? "current" : undefined} data-param={key} aria-hidden={key !== current}>
      {content}
    </div>
  );
  return (
    <div className={`param-help ${current === IDLE ? "idle" : ""}`}>
      {page(IDLE, m.help.idle)}
      {PARAM_NAMES.map((param) => page(param, <ParamPage param={param} params={params} />))}
      {FIELD_NAMES.map((field) => page(field, <FieldPage field={field} />))}
    </div>
  );
}

function ParamPage({ param, params }: Readonly<{ param: ParamName; params: CrcParams | undefined }>) {
  const m = useMessages();
  const info = m.params[param];
  const notes = params ? paramNotes(param, params, m) : [];
  return (
    <>
      <div className="param-help-head">
        <span className="param-help-title">{info.title}</span>
        <code className="param-name">{param}</code>
        <span>{info.summary}</span>
      </div>
      <div className="param-help-aliases">{m.help.aliases(info.aliases.join(m.listSeparator))}</div>
      {notes.map((note) => (
        <div key={note} className="param-help-note">
          {note}
        </div>
      ))}
    </>
  );
}

function FieldPage({ field }: Readonly<{ field: FieldName }>) {
  const info = useMessages().fields[field];
  return (
    <div className="param-help-head">
      <span className="param-help-title">{info.title}</span>
      <code className="param-name">{FIELD_LABELS[field]}</code>
      <span>{info.summary}</span>
    </div>
  );
}
