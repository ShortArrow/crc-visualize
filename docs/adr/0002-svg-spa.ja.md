[English](0002-svg-spa.md) | **日本語**

# ADR-0002: Motion Canvas を使わず、React + SVG の SPA で描画する

- 状態: 採用
- 日付: 2026-10-09

## 文脈

初期の構想は Motion Canvas で動画的なアニメーションを作るものだった。その後、CRC 設定を利用者が切り替えられる SPA にすることになった。設定が変わるとステップ数、つまりアニメーションの長さも変わる。

## 決定

Vite + React + TypeScript の SPA とし、計算済みのステップ列を SVG で描く。ステップ間の動きは CSS transition で補間する。

## 理由

- 描画がステップ番号の純粋関数になり、一時停止・コマ送り・逆再生・シークを同じ仕組みで実現できる。
- 設定変更時にステップ列を作り直すだけで済む。Motion Canvas Player に variables で設定を渡す方式では、尺の再計算や外側の UI との連携を player の制約の中で行う必要がある。
