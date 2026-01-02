# Game: warp-jump

## 概要
ジャンプしてモンスター（障害物）をよける、シンプルなランゲームです。  
プレイヤーと敵（小/中/大）の見た目を、**ドット絵メーカー**または**ポケモン図鑑**から選べます。

## 操作方法
- **PC**: `Space` / クリック でジャンプ
- **タッチ**: 画面タップでジャンプ

## ルール / 仕様
- **目的**: 障害物に当たらずに進み続ける
- **スコア**: 障害物を1つ越えるごとに +1（5点ごとに少し加速）
- **ゲームオーバー**: 障害物に当たったら終了

## 画面 / UI
- キャンバス（ゲーム画面）
- HUD（スコア、設定ボタン）
- 設定画面（設定ボタンで開く）
  - プレイヤー：デフォルト / ドット絵（種類：キャラ）/ ポケモン図鑑
  - 敵（小/中/大）：デフォルト / ドット絵（種類：キャラ/もの）/ ポケモン図鑑
- ゲームオーバー画面（リトライ、ポータルへ戻る）

## 実装メモ（設計）
- **エントリ**: `index.html`
- **メインロジック**: `script.js`
- **主要な状態(state)**: `player`, `obstacles`, `score`, `gameSpeed`, `isPaused`
- **データ保存**:
  - スプライト選択: localStorage（`n-games-warp-jump-sprite-<ownerId>-<slot>`）
    - slot: `player` / `enemy-small` / `enemy-medium` / `enemy-large`
    - 互換: 旧キー `n-games-selected-character-<ownerId>`（プレイヤーのドット絵選択のみ）
  - ドット絵本体: IndexedDB（`src/js/pixelAssets.js` 側）

## ファイル構成
- `index.html`: 画面/モーダルUI
- `style.css`: 見た目
- `script.js`: ゲーム進行 + 設定画面（ドット絵メーカー/図鑑 連携）
- `assets/player.png`: デフォルトプレイヤー画像
- `assets/enemy.png`: 障害物画像

## 既知の課題 / TODO
- キャラ画像の「当たり判定サイズ/見た目サイズ」の調整（小さい絵が見えづらい場合）
- スコア保存（Supabase）対応
