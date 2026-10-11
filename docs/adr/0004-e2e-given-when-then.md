# ADR-0004: E2E は Gherkin を使わず、Given / When / Then の手順とドメインの言葉のドライバで書く

- 状態: 採用
- 日付: 2026-10-11

## 文脈

E2E テストが読みにくかった。原因は次の 3 つだった。

- `stepForward(page, 3)` のように回数で状態を作り、どのステップにいるかをコメントで補っていた。
- `.lfsr [data-wire="feedback-0"]` のような図の内部の名前が本文に直接出ていた。
- 1 つのテストで前提・操作・確認を何度も繰り返していた。

BDD のフレームワーク（playwright-bdd、Cucumber.js、vitest-cucumber）の導入も検討した。

## 決定

- 各テストは 1 シナリオとし、`given` / `when` / `then`（`test.step` の薄い包み）で手順を分ける。Playwright の報告にも Given / When / Then として出る。
- 画面の操作と観察は `e2e/support/visualizer.ts` の `Visualizer` に集め、テスト本文はステップ・図・コード・経過の言葉で書く。状態は回数ではなく `goTo("xor")`、`goTo("shift", 2)` のようにステップの種類と順番で作る。
- シナリオは機能ごとのファイルに分ける。

## 理由

- 読みにくさの原因は書式ではなく、状態の作り方と語彙だった。ドライバで両方を直せば、Gherkin を足さなくても読める。
- Gherkin は文章とステップ定義の 2 層になり、同じ問題がステップ定義側へ移るだけになりやすい。依存と変換の仕組みも増える。

## 採らなかった案

- playwright-bdd: 開発者以外が `.feature` を仕様として読む必要が出たときに、E2E だけに足す余地を残す。
- Cucumber.js: Vite・Playwright との組み合わせの手間が最も大きい。
