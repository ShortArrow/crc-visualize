import { GENERATORS, period, type Generator } from "../domain/cyclic";
import { formatValue } from "../domain/narrow";
import { useMessages } from "../i18n/I18n";
import { polynomialText } from "./format";
import { generatorHash, type GeneratorPage } from "./route";

type Props = Readonly<{ page: GeneratorPage; generator: Generator }>;

/** サイドバーに置く、選べる生成多項式の一覧。選ぶと page のまま generator を替える。 */
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

/** ステータスバーに出す、生成多項式と周期。 */
export const generatorStatus = (g: Generator): string => `g(x) = ${polynomialText(g.width, g.poly)}, n = ${period(g)}`;
