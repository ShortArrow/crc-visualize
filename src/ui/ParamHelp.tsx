import type { ReactNode } from "react";
import { PARAM_NAMES, type CrcParams, type ParamName } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { FIELD_LABELS, paramNotes, type FieldName, type HelpTopic } from "./paramInfo";

type Props = Readonly<{ topic: HelpTopic | undefined; params: CrcParams | undefined }>;

const FIELD_NAMES = Object.keys(FIELD_LABELS) as FieldName[];

const IDLE = "idle";

/**
 * Name and description of the focused field (in the display language). For a parameter, also adds aliases and a note depending on the setting; omits the note while params is absent (settings invalid).
 * Draws every field's description stacked in the same place and shows only the focused one.
 * The panel height fits the longest description, so nothing is cut off at any width and the height stays the same when focus changes.
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
