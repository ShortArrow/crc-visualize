[English](README.md) | **日本語**

# CRC Visualizer

LFSR（ハードウェア）の 1 クロックと、ビット単位 CRC 実装（ソフトウェア）の 1 行を同期させて見せる SPA。CRC 設定は Rocksoft モデル（width / poly / init / refin / refout / xorout）で切り替えられる。

公開先: https://crc.shortarrow.jp/

仕様は [docs/spec.ja.md](docs/spec.ja.md)、設計判断は [docs/adr/](docs/adr/) にある。

## 使い方

```sh
npm install
npm run dev        # 開発サーバ
npm test           # 単体テスト (Vitest)
npm run e2e        # E2E テスト (Playwright、インストール済みの Chrome を使う)
npm run build      # dist/ に静的ファイルを出力
npm run og-image   # 共有時に表示する画像 public/og.png を作り直す（開発サーバの URL を渡す）
npm run deploy     # ビルドして dist/ を crc.shortarrow.jp に公開 (Cloudflare Workers、wrangler.jsonc)
```

`main` への変更は pull request を通す。pull request ごとに GitHub Actions（`.github/workflows/ci.yml`）で型検査・単体テスト・E2E テストが走り、`main` に追いついたブランチで通ったときだけマージできる。このリポジトリにつないだ Cloudflare Workers Builds が、`main` を crc.shortarrow.jp に、pull request のブランチをそれぞれの preview URL に公開する。Cloudflare の認証情報は GitHub に置かない。

キー操作: Space で再生 / 一時停止、← → で 1 ステップ移動、Home / End で先頭 / 末尾、L でループ再生の切り替え。

デバッガのように、サイドバーに表示中のステップでの変数を出し、ブレークポイントで再生を止められる。コードの行番号の左を押すとその行で止まり（5 回目の XOR のように、何回目で止めるかも指定できる）、入力ストリームのバイトを押すとそのバイトを読み終えたところで止まる。

設定（CRC パラメータ、入力、速度、ループ、ブレークポイント）はブラウザの localStorage に保存され、次に開いたときに復元される。同じ設定は URL のクエリにも載るので、アドレスバーの URL を渡せば同じ設定で開ける（URL の設定が保存値より優先）。

## 構成

| ディレクトリ      | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain`      | CRC のステップ列生成 (`trace`)、フォームの検証 (`parseConfig`)、プリセットとその名前の一族・別名 (`naming`)、値の固定による候補の絞り込み (`narrow`)、巡回符号の性質を示す生成多項式の周期と符号語 (`cyclic`)、誤りの判定と符号語の数 (`redundancy`)、送る並びと 2 つの確かめ方と残余 (`check`)、同じ CRC になる置き換えと送り方 (`equivalence`)、1 バイトずつの表引き (`table`)、データと CRC の組からのパラメータの推定 (`estimate`)                                                                  |
| `src/i18n`        | 表示言語の決め方 (`locale`)、言語ごとの画面の文の辞書（`ja` が形の基準、他の言語は同じ形）、辞書を配る `MessagesProvider` / `useMessages`                                                                                                                                                                                                                                                                                                                                                               |
| `src/playback`    | 再生状態の遷移と速度ランプ、ブレークポイント (`breakpoints`)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `src/ui`          | コードの言語ごとの書き方 (`codeLangs`) と共通の雛形 (`codeTemplate`)、コードのハイライト (`code`)、LFSR 図の配置、ページの切替 (`route`)、VS Code 風の画面の枠 (`Workbench`) と画面割りの保存 (`panes`)、React コンポーネント（可視化・名前の規則・絞り込みのページ）                                                                                                                                                                                                                                   |
| `src/settings.ts` | 設定の保存と復元（localStorage と URL のクエリ）                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/testing`     | 単体テストで共有する入力とステップの用意、テストの書き方の確認 (`setup.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `e2e`             | 機能ごとの E2E シナリオ。1 テスト 1 シナリオで、`given` / `when` / `then` の手順に分けて書く。ブラウザの言語は日本語（`ja-JP`）で動かす                                                                                                                                                                                                                                                                                                                                                                 |
| `e2e/support`     | 画面をステップ・図・コード・経過の言葉で操作し観察するドライバ (`Visualizer`)、名前の規則のページのドライバ (`NamesPage`)、絞り込みのページのドライバ (`NarrowPage`)、巡回のページのドライバ (`CyclicPage`)、冗長のページのドライバ (`RedundancyPage`)、検査のページのドライバ (`CheckPage`)、置き換えのページのドライバ (`EquivalencePage`)、表引きのページのドライバ (`TablePage`)、推定のページのドライバ (`EstimatePage`)、手順の並びを確かめる `test` と `given` / `when` / `then` (`scenario.ts`) |

テストは単体・E2E とも 1 テスト 1 シナリオで、Given / When / Then に分けて書き、テストの名前と手順の文は英語で書く。単体テストは入れ子にせず `describe("<subject>")` の直下に `it("Given <precondition>, When <action>, Then <result>")` を並べ、前提は `src/testing` の関数で各テストの中に用意する。この形は `src/testing/setup.ts` が全テストの前に確かめ、崩れたテストは失敗する。E2E は `test.describe("<feature>")` の直下に要約の名前でテストを置き、`e2e/support/scenario.ts` の `given` / `when` / `then` を「Given 1 つ → When と 1 つ以上の Then の組の繰り返し」の順に並べる。この並びは同じファイルの `test` が通ったテストごとに確かめる。E2E の確かめる対象は日本語の画面なので、ブラウザの言語は日本語（`ja-JP`）で動かす。

## 文書とコメントの言語

文書は英語（`*.md`）と日本語（`*.ja.md`）の 2 つを置き、片方を変えるときはもう片方も同時に直す。コードのコメントと docstring は英語で書く。

## ライセンス

[MIT](LICENSE)
