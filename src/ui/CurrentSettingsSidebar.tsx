import { formatValue } from "../domain/narrow";
import type { ConfigForm, ConfigResult } from "../domain/parse";
import { PARAM_NAMES } from "../domain/trace";
import { useMessages } from "../i18n/I18n";

/**
 * Sidebar showing the current settings (the 6 parameters, and the input as entered in form) and a link to the visualization
 * page where they are changed.
 */
export function CurrentSettingsSidebar({ config, form }: Readonly<{ config: ConfigResult; form: ConfigForm }>) {
  const m = useMessages();
  return (
    <>
      <h2>{m.currentSettings.heading}</h2>
      {config.ok ? (
        <dl className="current-settings">
          {PARAM_NAMES.map((param) => (
            <div key={param} data-setting={param}>
              <dt>{param}</dt>
              <dd>{formatValue(param, config.params[param])}</dd>
            </div>
          ))}
          <div data-setting="inputMode">
            <dt>inputMode</dt>
            <dd>{form.inputMode}</dd>
          </div>
          <div data-setting="input">
            <dt>input</dt>
            <dd className="input-text">{form.input}</dd>
          </div>
        </dl>
      ) : (
        <p className="note">{m.settings.invalidStatus}</p>
      )}
      <a href="#">{m.currentSettings.openVisualizer}</a>
    </>
  );
}
