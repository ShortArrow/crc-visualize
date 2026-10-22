[English](0004-branch-strategy.md) | **日本語**

# ADR-0004: `main` は CI を通った pull request でだけ変え、Cloudflare Workers Builds が `main` をそのまま公開する

- 状態: 採用
- 日付: 2026-10-22

## 文脈

アプリは Cloudflare Workers で crc.shortarrow.jp に公開する。公開するのは、型検査・単体テスト・E2E テストを通った commit にしたい。

GitHub Actions から公開するには、Cloudflare の API トークンをリポジトリのシークレットに置く必要がある。Cloudflare は GitHub の OIDC トークンを受け付けないので、短命の認証情報に置き換えられない。GitHub App でリポジトリにつなぐ Cloudflare Workers Builds なら GitHub に認証情報を置かずに公開できるが、push されたブランチを CI を待たずにすぐ公開する。

## 決定

- 作業は短命のブランチで行い、pull request で `main` にマージする（pull request を通す trunk-based development）。
- `main` のルールセットで、`main` に追いついたブランチで CI のチェック `test` が通ることをマージの条件にする。これでマージ後の内容そのものがテスト済みになる。
- Workers Builds は `main` を本番のブランチにし、crc.shortarrow.jp に公開する。ほかのブランチは preview としてビルドし、それぞれの preview URL に出す。

## 理由

- `main` にはテスト済みの commit しか入らないので、`main` が変わるたびにすぐ公開しても、公開されるのはテスト済みの commit だけになる。
- GitHub に Cloudflare の認証情報を置かない。
- pull request ごとに、マージ前の動く姿を preview URL で見られる。

## 結果

- private リポジトリのルールセットには GitHub の有料プランが要るので、リポジトリは public にする。

## 採らなかった案

- `main` に直接 push し、CI の後に GitHub Actions から公開する: Cloudflare の API トークンをリポジトリのシークレットに置く必要がある。
- `main` に直接 push し、CI の後に commit を `production` ブランチへ進め、Workers Builds がそれを公開する: シークレットは要らないが、ブランチとジョブが 1 つずつ増え、テストを通っていない commit も `main` に入る。
- `main` に直接 push し、Workers Builds が `main` を公開する: テストに落ちる commit が、CI の終わる前に公開される。
