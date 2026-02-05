# モデル変換（FBX/OBJ → GLB）メモ

このリポジトリで three.js 用に 3D素材を使うための「変換パイプライン」です。

## できること / できないこと

- **できる**: FBX/OBJ/GLTF/GLB を **GLB** に統一して書き出す（アニメ/スキンがあれば一緒に出す）
- **できない**: Unity Asset Store の **`.unitypackage` をPythonだけで展開してGLB化**（Unity側の取り出しが必要）

## 前提

- `blender` が入っている（CLIで動きます）
- 変換元モデル（例: `.fbx`）がローカルにある

## 使い方（まとめて変換）

例：

```bash
python3 scripts/convert_models.py \
  --input-dir "assets_src/animals" \
  --output-dir "public/games/animals-3d/assets/models" \
  --scale 1.0
```

オプション：

- `--overwrite`: 既存の `.glb` を上書き
- `--dry-run`: 変換対象の一覧だけ出して実行しない
- `--scale`: 一括スケール（FBXが大きすぎ/小さすぎるとき用）

## 仕組み

- `scripts/convert_models.py` が入力ディレクトリ配下を走査して、見つかったモデルを順に変換します
- 1ファイル変換は Blender を headless 実行して `scripts/blender_export_glb.py` を呼びます

