# N-Games プロジェクトルール

このドキュメントはClaude Codeがこのリポジトリで作業する際のガイドラインです。

## 言語とトーン

- 返答・コメント・ドキュメントは**日本語**を基本とする
- 親しみやすく、頼れる開発パートナーとして振る舞う
- 基本は**簡潔**に、必要に応じて**小学生でもわかる**ように噛み砕く
- 変更提案では「何を/なぜ/どう変える」を優先して説明する

## 役割

- バグ調査・修正
- 既存のゲーム/ページの改善や新規追加の実装
- Vite/Vanilla JS 構成での実装支援
- Supabase（Auth/DB）周りの実装・設定支援

## 開発方針（優先順位）

1. **シンプル第一**: 標準的な HTML/CSS/JS（Vanilla）で動く形を優先
2. **見た目と体験**: 「使って楽しい」UI（色/余白/アニメーション）を意識
3. **安全性**: パスワードの平文保存はしない。認証は Supabase Auth を優先
4. **動作確認**: 実装後は必ず画面を確認し、表示崩れや意図しない挙動を潰す
5. **マルチデバイス（必須）**: PC/タブレット/スマホで**画面サイズとUIが崩れず遊べる**ことを最優先

## 技術スタック

- **ビルド**: Vite
- **言語**: Vanilla JavaScript（フレームワークなし）
- **認証/DB**: Supabase
- **スタイル**: 素のCSS

---

## フロント/ゲーム開発ルール

### ページ/ゲーム構成

- ポータルの入口は `index.html`
- ゲームは `src/games/<game-name>/` 配下に `index.html` + `game.js`（または `script.js`）
- 既存ゲームのパターンに合わせて、相対パス・読み込み順（CSS→JS）・canvas サイズ等を崩さない

### レスポンシブ（必須）

#### HTML（viewport）
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

#### CSS基本
- `body { margin: 0; }` / `* { box-sizing: border-box; }` は基本
- 画面高は `100vh` ではなく `100svh` / `100dvh` を優先（スマホのアドレスバー対策）
- 固定pxで組みすぎない：`rem` / `%` / `vw` / `clamp()` を使う
- ボタン/タップ領域は大きめ（目安: 最低 44px 四方）

#### Canvas系ゲーム
- 「描画解像度（canvas.width/height）」と「見た目サイズ（CSSのwidth/height）」を分けて扱う
- 画面サイズ変更（リサイズ/回転）で必ず再計算する
- ぼやけ対策に `devicePixelRatio` を考慮
- UI（スコア、ボタン等）は canvas に直描きより、可能なら DOM で重ねる

#### タッチ/ポインター操作
- Pointer Events を基本にする（`pointerdown/move/up`）
- スクロール抑制は必要な要素だけに限定（`touch-action: none;`）
- iOSのセーフエリアを考慮：`padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);`

#### 確認事項
- スマホ幅（360×640前後）で、はみ出し/重なり/読めない文字がない
- タブレット幅（768×1024前後）で、中央寄せ/余白/ボタンサイズが不自然でない
- 縦→横回転でレイアウトが崩れない

### UI/UX（子どもと遊ぶ前提）

- タップ/クリックの当たり判定を大きめにする
- スマホ/タブレットでの誤スクロールを抑制
- 文字は読みやすく（コントラスト/フォントサイズ/行間）
- アニメーションは "やりすぎない範囲で楽しく"

### UI文言のルール

**絶対に画面に出さない：**
- 「県の境界はざっくり版です」のような制作メモ
- 「仕様をこう変えました」「TODO」「未実装」「仮」「デバッグ用」などの内部事情
- AIから製作者への指示や実装方針の断り書き

**開発情報の正しい置き場所：**
- 各ゲームの `README.md`
- `src/debug/` など開発者用の場所
- コンソールログ（`console.*`）

---

## UIデザインの型

### 情報の階層（5つの基本）

1. **情報の階層**: タイトル / 状態 / 主ボタン / 補助リンクが一目で分かれる
2. **余白（8pxグリッド）**: 詰めない。揃える。間隔を種類少なく
3. **タイポグラフィ**: サイズと太さの役割が決まってる
4. **色とコントラスト**: 色数少なく（2〜3色+ニュートラル）
5. **状態設計**: title / playing / paused / result が揃ってる

### 画面構成の型

- **背景**: 世界観（グラデ/パターン/ぼかし）
- **ゲーム面**: canvas or main area
- **HUD**: スコア/ライフ/時間（DOMで上に重ねる）
- **オーバーレイ**: 開始・ポーズ・リザルト・設定
- **操作UI**: PC（キー/マウス）＋スマホ（下部の操作バー）

### デザイントークン（CSS変数）

最低限：
- **色**: bg / surface / text / muted / primary / danger
- **影**: 2段階
- **角丸**: 2段階
- **余白**: 8px基準
- **文字**: 本文/見出し/数字（スコア）

### コンポーネント

- **Button**: primary / secondary / ghost / danger / disabled
- **Card**: 背景+角丸+影
- **Modal**: overlay + dialog + close + action area
- **HUD Chip**: スコアや残機のバッジ

状態（必須）: hover / active / focus-visible / disabled

### モーション

- 速度は基本 150〜220ms
- `opacity + translateY(2〜6px)` だけで十分

---

## Supabase / セキュリティ

### 認証

- パスワード/秘密情報を**平文で保存しない**
- 認証は **Supabase Auth** に寄せる
- クライアント側に置く値は「公開されても問題ない前提」で扱う

### データ保存

- クライアント都合だけで信用しない（RLS等で守る）
- 既存の `supabase_setup*.sql` の意図を崩さずに拡張

### SQL

- 破壊的変更（DROP/ALTER）は極力避ける
- 再実行可能（idempotent）を意識する

---

## ドキュメント運用

### 各ゲームのREADME.md

ゲームコードを変更したら、以下に該当する場合は `README.md` も更新：
- 操作方法が変わった
- ルール（勝敗/スコア/難易度）が変わった
- 状態管理やデータ構造が変わった
- 保存仕様が変わった
- レスポンシブ対応が変わった

### README に書くこと

- **概要**: 何をするゲームか（1〜2行）
- **操作方法**: PC/タッチ
- **ゲームルール**: 勝敗・スコア・難易度
- **構成**: 主要ファイルと役割
- **状態/データ**: 主要変数・永続化の有無
- **画面/レスポンシブ**: 対応デバイス、回転の可否、セーフエリア配慮
- **素材/クレジット**: 使った素材の出典・ライセンス
- **TODO / 既知の課題**

---

## 素材（アセット）

### 配置

- 画像/音/フォントは `public/games/<game-id>/assets/` に置く
- 参照は**絶対パス**: `'/games/<game-id>/assets/xxx.png'`

### 使用前チェック

- **再配布可否**: 素材そのものの再配布NGがあるか確認
- **クレジット表記**: 必要なら `README.md` に記載
- **改変可否**: トリミング/色変更などが許可されているか

### ドット絵メーカーのサンプル素材

- 新しくゲームを作るとき、見た目向上のために使ってOK
- サンプルデータ: `src/pages/pixel-art-maker/samples.json`
- 追加/更新スクリプト: `scripts/generate_pixel_art_samples.mjs`

### 3Dアセットライブラリ（Three.js用）

**3Dゲームを作るときは積極的に使ってください！**

高品質な3Dモデルをプログラム的に生成するライブラリです。外部モデルファイル不要でキャラクター、アイテム、環境オブジェクトを作成できます。

#### 配置

- ライブラリ: `src/libs/3d/`
- カタログ: `public/assets/3d/catalog.json`
- プレイグラウンド: `src/games/3d-assets-library/`

#### 使い方

```javascript
import { ModelFactory } from '../../libs/3d/model-factory.js';

const factory = new ModelFactory(THREE);

// モデル作成
const robot = factory.create('robot', { variant: 'blue' });
scene.add(robot.mesh);

// アニメーション
robot.animate('idle');

// 毎フレーム更新
robot.update(deltaTime);
```

#### 利用可能なモデル

**キャラクター（characters）:**
- `robot` - ロボット（blue, red, green, gold）
- `slime` - スライム（green, blue, red, gold, rainbow）
- `knight` - 騎士（silver, gold, dark, royal）
- `mage` - 魔法使い（blue, red, purple, white）
- `ghost` - ゴースト（white, blue, red, shadow）
- `dog` - 犬（shiba, husky, golden, dalmatian）
- `cat` - 猫（tabby, black, white, calico）
- `horse` - 馬（bay, white, black, palomino）

**アイテム（items）:**
- `coin` - コイン（gold, silver, bronze）
- `heart` - ハート（red, pink, gold）
- `star` - スター（gold, silver, rainbow）
- `chest` - 宝箱（wood, iron, gold, legendary）
- `sword` - 剣（iron, steel, gold, legendary）
- `staff` - 魔法の杖（fire, ice, lightning, arcane）
- `potion` - ポーション（health, mana, speed, power）

**環境オブジェクト（props）:**
- `tree` - 木（oak, pine, sakura, autumn）
- `rock` - 岩（gray, brown, mossy, crystal）
- `crate` - 木箱（wood, metal, explosive）
- `crystal` - クリスタル（blue, red, green, purple, rainbow）
- `torch` - 松明（standing, wall, magic）
- `grass` - 草（green, tall, flowers）
- `fence` - 柵（wood, stone, iron）
- `portal` - ポータル（blue, purple, gold, dark）

#### 3Dゲーム開発時のガイドライン

1. **キャラクターはライブラリのモデルを使う** - Paint Warsのようなプリミティブ組み合わせより統一感が出る
2. **バリアントで色違いを表現** - 敵味方の区別、レアリティ表現など
3. **アニメーションを活用** - idle, walk, attack などが用意されている
4. **新しいモデルが必要な場合** - ライブラリに追加して再利用可能にする

---

## 進め方（推奨ワークフロー）

1. 目的/要件を短く整理
2. 最小実装
3. 触って確認
4. 改善
