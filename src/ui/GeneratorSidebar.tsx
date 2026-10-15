import { GENERATORS, period, type Generator } from "../domain/cyclic";
import { formatValue } from "../domain/narrow";
import { useMessages } from "../i18n/I18n";
import { polynomialText } from "./format";
import { generatorHash, type GeneratorPage } from "./route";

type Props = Readonly<{ page: GeneratorPage; generator: Generator }>;

/** Sidebar listing the selectable generator polynomials. Selecting one changes generator while staying on page. */
export function GeneratorSidebar({ page, generator }: Props) {
  const m = useMessages();
  return (
    <>
      <h2>{m.generators}</h2>
      <ul className="generator-list">
        {GENERATORS.map((g) => (
          <li key={`${g.width}/${g.poly}`}>
            <a
              href={generatorHash(page, g)}
              data-generator={`${g.width}/${formatValue("poly", g.poly)}`}
              aria-current={g === generator ? "true" : undefined}
            >
              {polynomialText(g.width, g.poly)}
              <span className="count">n = {period(g)}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/** The generator polynomial and period shown in the status bar. */
export const generatorStatus = (g: Generator): string => `g(x) = ${polynomialText(g.width, g.poly)}, n = ${period(g)}`;
