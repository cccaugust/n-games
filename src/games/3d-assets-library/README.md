# 3D Assets Library

3Dモデルを自由に配置して遊べる箱庭ゲーム。
ゲーム開発用の高品質3Dアセットライブラリのショーケースも兼ねています。

## 概要

- 用意された3Dモデルをグリッドに配置
- モデルの回転・拡大縮小・移動が可能
- スクリーンショット撮影機能付き

## 操作方法

### PC
- **マウスドラッグ**: カメラ回転
- **ホイール**: ズーム
- **右クリックドラッグ**: カメラ移動
- **クリック**: モデル配置/選択/削除（ツールによる）

### タッチ（タブレット/スマホ）
- **1本指ドラッグ**: カメラ回転
- **ピンチ**: ズーム
- **2本指ドラッグ**: カメラ移動
- **タップ**: モデル配置/選択/削除

## ツール

| ツール | 説明 |
|--------|------|
| + (配置) | 選択したモデルをクリック位置に配置 |
| ↔ (移動) | 配置済みモデルをクリックして選択 |
| ↻ (回転) | 配置済みモデルをクリックして選択 |
| ⇲ (拡縮) | 配置済みモデルをクリックして選択 |
| × (削除) | クリックしたモデルを削除 |

## 利用可能なモデル

### キャラクター
- **ロボット** - メカニカルなデザイン（blue, red, green, gold）
- **スライム** - ぷるぷる動く半透明（green, blue, red, gold, rainbow）
- **騎士** - 重装備の戦士（silver, gold, dark, royal）
- **魔法使い** - ローブと魔法の杖（blue, red, purple, white）

### アイテム
- **コイン** - 回転する金貨（gold, silver, bronze）
- **ハート** - 脈打つ回復アイテム（red, pink, gold）
- **スター** - 輝く星（gold, silver, rainbow）
- **宝箱** - 開閉アニメ付き（wood, iron, gold, legendary）
- **剣** - 近接武器（iron, steel, gold, legendary）
- **魔法の杖** - 宝石が光る（fire, ice, lightning, arcane）
- **ポーション** - 泡立つ魔法の薬（health, mana, speed, power）

### 環境オブジェクト
- **木** - 揺れる葉っぱ（oak, pine, sakura, autumn）
- **岩** - 自然な形状（gray, brown, mossy, crystal）
- **木箱** - 破壊可能風（wood, metal, explosive）
- **クリスタル** - 輝く魔法の結晶（blue, red, green, purple, rainbow）
- **松明** - ゆらめく炎（standing, wall, magic）
- **草** - 風に揺れる（green, tall, flowers）
- **柵** - 区切り・装飾（wood, stone, iron）
- **ポータル** - 異世界への扉（blue, purple, gold, dark）

## 構成ファイル

```
src/games/3d-assets-library/
├── index.html    # メインHTML
├── game.js       # ゲームロジック
└── README.md     # このファイル

public/assets/3d/
├── catalog.json  # アセットカタログ
└── lib/
    ├── model-factory.js  # メインファクトリー
    ├── materials.js      # マテリアルライブラリ
    ├── animations.js     # アニメーションシステム
    ├── characters.js     # キャラクターモデル
    ├── items.js          # アイテムモデル
    └── props.js          # 環境オブジェクト
```

## 他のゲームでの利用方法

このライブラリの3Dモデルは他の3Dゲームでも利用できます。

```javascript
import * as THREE from 'three';
import { ModelFactory } from '/assets/3d/lib/model-factory.js';

// ファクトリー作成
const factory = new ModelFactory(THREE);

// モデル作成
const robot = factory.create('robot', { variant: 'blue' });
scene.add(robot.mesh);

// アニメーション開始
robot.animate('idle');

// 毎フレームの更新
function animate() {
  robot.update(deltaTime);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

## レスポンシブ対応

- PC/タブレット/スマホ対応
- サイドパネルはモバイルでオーバーレイ表示
- タッチ操作に最適化

## 技術スタック

- Three.js r160
- OrbitControls
- プロシージャル3Dモデル生成
- CanvasTexture によるテクスチャ生成
