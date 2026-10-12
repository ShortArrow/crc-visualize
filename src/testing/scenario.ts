const SCENARIO_NAME = /^Given .+, When .+, Then .+$/s;
const SCENARIO_STEPS = /^G(T*)(WT+)*$/;

/** E2E の手順の種類。e2e/support の given / when / then がこの順の言葉で報告に出る。 */
export type StepKeyword = "Given" | "When" | "Then";

function placementViolation(describes: readonly string[]): string | undefined {
  return describes.length === 1
    ? undefined
    : `テストは describe("<対象>") の直下に置く（いまの入れ子: ${JSON.stringify(describes)}）`;
}

/**
 * 単体テスト 1 件が書き方の決まりを破っていればその説明を、守っていれば undefined を返す。
 * 決まり: テストは `describe("<対象>")` の直下に置き、名前を `Given <前提>, When <操作>, Then <結果>` とする。
 * describes はテストを囲む describe の名前を外側から並べたもの。
 */
export function scenarioViolation(name: string, describes: readonly string[]): string | undefined {
  const misplaced = placementViolation(describes);
  if (misplaced) return misplaced;
  if (!SCENARIO_NAME.test(name)) {
    return `テスト名は "Given …, When …, Then …" にする（いまの名前: ${JSON.stringify(name)}）`;
  }
  return undefined;
}

/**
 * E2E テスト 1 件が書き方の決まりを破っていればその説明を、守っていれば undefined を返す。
 * 決まり: テストは `test.describe("<機能>")` の直下に置き、最上位の手順を
 * Given 1 つ → 前提の確認の Then（任意）→ When と 1 つ以上の Then の組の繰り返し、の順に並べ、Then で終える。
 * steps はテストの最上位の手順の種類を実行順に並べたもの。
 */
export function scenarioStepsViolation(describes: readonly string[], steps: readonly StepKeyword[]): string | undefined {
  const misplaced = placementViolation(describes);
  if (misplaced) return misplaced;
  const shape = steps.map((k) => k[0]).join("");
  if (!SCENARIO_STEPS.test(shape) || !shape.endsWith("T")) {
    return `手順は Given 1 つで始め、When の後に 1 つ以上の Then を続け、Then で終える（いまの手順: ${steps.join(" → ") || "なし"}）`;
  }
  return undefined;
}
