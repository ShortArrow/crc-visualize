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
