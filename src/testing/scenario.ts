const SCENARIO_NAME = /^Given .+, When .+, Then .+$/s;

/**
 * 単体テスト 1 件が書き方の決まりを破っていればその説明を、守っていれば undefined を返す。
 * 決まり: テストは `describe("<対象>")` の直下に置き、名前を `Given <前提>, When <操作>, Then <結果>` とする。
 * describes はテストを囲む describe の名前を外側から並べたもの。
 */
export function scenarioViolation(name: string, describes: readonly string[]): string | undefined {
  if (describes.length !== 1) {
    return `テストは describe("<対象>") の直下に置く（いまの入れ子: ${JSON.stringify(describes)}）`;
  }
  if (!SCENARIO_NAME.test(name)) {
    return `テスト名は "Given …, When …, Then …" にする（いまの名前: ${JSON.stringify(name)}）`;
  }
  return undefined;
}
