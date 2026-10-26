import { formatValue } from "../domain/narrow";
import type { Preset } from "../domain/presets";
import { PARAM_NAMES, type ParamName } from "../domain/trace";
import { useMessages } from "../i18n/I18n";

type Props = Readonly<{
  presets: readonly Preset[];
  /** Parameters whose column headings are emphasized (class splits). */
  splits?: ReadonlySet<ParamName>;
  /** Extra classes of a preset's row. */
  rowClass?: (preset: Preset) => string;
}>;

/**
 * Presets one per row: the official name, the six parameters written as formatValue does, and check (the CRC of "123456789").
 * Each row carries data-preset (the name) and data-width. On a phone the table scrolls sideways inside its wrapper.
 */
export function PresetTable({ presets, splits, rowClass }: Props) {
  const m = useMessages();
  return (
    <div className="preset-table-scroll">
      <table className="preset-table">
        <thead>
          <tr>
            <th>{m.presetName}</th>
            {PARAM_NAMES.map((param) => (
              <th key={param} data-param={param} className={splits?.has(param) ? "splits" : undefined}>
                {param}
              </th>
            ))}
            <th>check</th>
          </tr>
        </thead>
        <tbody>
          {presets.map((preset) => (
            <tr key={preset.name} data-preset={preset.name} data-width={preset.params.width} className={rowClass?.(preset)}>
              <td>{preset.name}</td>
              {PARAM_NAMES.map((param) => (
                <td key={param}>{formatValue(param, preset.params[param])}</td>
              ))}
              <td>{formatValue("xorout", preset.check)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
