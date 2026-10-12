# CRC Visualizer

LFSR（ハードウェア）の 1 クロックと、ビット単位 CRC 実装（ソフトウェア）の 1 行を同期させて見せる SPA。CRC 設定は Rocksoft モデル（width / poly / init / refin / refout / xorout）で切り替えられる。

仕様は [docs/spec.md](docs/spec.md)、設計判断は [docs/adr/](docs/adr/) にある。

## 使い方

```sh
npm install
npm run dev        # 開発サーバ
npm test           # 単体テスト (Vitest)
npm run e2e        # E2E テスト (Playwright、インストール済みの Chrome を使う)
npm run build      # dist/ に静的ファイルを出力
```

キー操作: Space で再生 / 一時停止、← → で 1 ステップ移動、Home / End で先頭 / 末尾、L でループ再生の切り替え。

設定（CRC パラメータ、入力、速度、ループ）はブラウザの localStorage に保存され、次に開いたときに復元される。同じ設定は URL のクエリにも載るので、アドレスバーの URL を渡せば同じ設定で開ける（URL の設定が保存値より優先）。

## 構成

| ディレクトリ | 内容 |
|---|---|
| `src/domain` | CRC のステップ列生成 (`trace`)、フォームの検証 (`parseConfig`)、プリセット |
| `src/playback` | 再生状態の遷移と速度ランプ |
| `src/ui` | 擬似コードのハイライト、LFSR 図の配置、React コンポーネント |
| `src/settings.ts` | 設定の保存と復元（localStorage と URL のクエリ） |
| `src/testing` | 単体テストで共有する入力とステップの用意、テストの書き方の確認 (`setup.ts`) |
| `e2e` | 機能ごとの E2E シナリオ。1 テスト 1 シナリオで、`given` / `when` / `then` の手順に分けて書く |
| `e2e/support` | 画面をステップ・図・コード・経過の言葉で操作し観察するドライバ (`Visualizer`)、手順の並びを確かめる `test` と `given` / `when` / `then` (`scenario.ts`) |

テストは単体・E2E とも 1 テスト 1 シナリオで、Given / When / Then に分けて書く。単体テストは入れ子にせず `describe("<対象>")` の直下に `it("Given <前提>, When <操作>, Then <結果>")` を並べ、前提は `src/testing` の関数で各テストの中に用意する。この形は `src/testing/setup.ts` が全テストの前に確かめ、崩れたテストは失敗する。E2E は `test.describe("<機能>")` の直下に要約の名前でテストを置き、`e2e/support/scenario.ts` の `given` / `when` / `then` を「Given 1 つ → When と 1 つ以上の Then の組の繰り返し」の順に並べる。この並びは同じファイルの `test` が通ったテストごとに確かめる。
