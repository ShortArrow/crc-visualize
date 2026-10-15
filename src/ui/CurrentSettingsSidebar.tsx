import { formatValue } from "../domain/narrow";
import type { ConfigResult } from "../domain/parse";
import { PARAM_NAMES } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { bitsToString } from "./format";

/** Sidebar showing the current settings (the 6 parameters and the input) and a link to the visualization page where they are changed. */
export function CurrentSettingsSidebar({ config }: Readonly<{ config: ConfigResult }>) {
  const m = useMessages();
  return (
    <>
      <h2>{m.currentSettings.heading}</h2>
      {config.ok ? (
        <dl className="current-settings">
          {PARAM_NAMES.map((param) => (
            <div key={param}>
              <dt>{param}</dt>
              <dd>{formatValue(param, config.params[param])}</dd>
            </div>
          ))}
          <div>
            <dt>input</dt>
            <dd className="input-bits">{bitsToString(config.bits)}</dd>
          </div>
        </dl>
      ) : (
        <p className="note">{m.settings.invalidStatus}</p>
      )}
      <a href="#">{m.currentSettings.openVisualizer}</a>
    </>
  );
}
