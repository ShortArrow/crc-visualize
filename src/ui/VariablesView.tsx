import type { Step } from "../domain/trace";
import { useMessages } from "../i18n/I18n";
import { variables } from "./variables";

/** The variables at steps[index]: the code's variables by name and the counters by their label. A changed value is marked (changed). */
export function VariablesView({ steps, index }: Readonly<{ steps: readonly Step[]; index: number }>) {
  const m = useMessages();
  const label = { bitsRead: m.debug.bitsRead, xorCount: m.debug.xorCount } as Partial<Record<string, string>>;
  return (
    <dl className="variables">
      {variables(steps, index).map(({ name, value, changed }) => (
        <div key={name} className={`var ${changed ? "changed" : ""}`} data-var={name}>
          <dt className={label[name] ? "var-name counter-name" : "var-name"}>{label[name] ?? name}</dt>
          <dd className="var-value">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
