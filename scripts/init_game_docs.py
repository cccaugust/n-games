#!/usr/bin/env python3
"""
Create per-game README.md skeletons for:
  - src/games/* (folders with index.html)
  - src/pages/* (folders with index.html)

Does not overwrite existing README.md unless --force is provided.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Target:
    kind: str  # "game" | "page"
    name: str
    dir_path: Path


README_TEMPLATE = """# {title}

## 概要
TODO: 1〜2行で、このゲーム/ページが何をするか書く。

## 操作方法
- **PC**: TODO
- **タッチ**: TODO（必要なら）

## ルール / 仕様
- **目的**: TODO
- **スコア**: TODO（加点/減点/保存など）
- **ゲームオーバー / クリア条件**: TODO

## 画面 / UI
- TODO: 主要なUI（ボタン、HUD、モーダル等）

## 実装メモ（設計）
- **エントリ**: `index.html`
- **メインロジック**: TODO（例: `game.js` / `script.js`）
- **主要な状態(state)**: TODO（例: player, enemies, score, level）
- **データ保存**: TODO（なし / localStorage / Supabase）

## ファイル構成
TODO: 主要ファイルと役割を箇条書きで書く。

## 既知の課題 / TODO
- TODO
"""


def find_targets(repo_root: Path) -> list[Target]:
    targets: list[Target] = []

    games_root = repo_root / "src" / "games"
    if games_root.is_dir():
        for d in sorted(games_root.iterdir()):
            if not d.is_dir():
                continue
            if (d / "index.html").exists():
                targets.append(Target(kind="game", name=d.name, dir_path=d))

    pages_root = repo_root / "src" / "pages"
    if pages_root.is_dir():
        for d in sorted(pages_root.iterdir()):
            if not d.is_dir():
                continue
            if (d / "index.html").exists():
                targets.append(Target(kind="page", name=d.name, dir_path=d))

    return targets


def title_for(t: Target) -> str:
    prefix = "Game" if t.kind == "game" else "Page"
    return f"{prefix}: {t.name}"


def ensure_readme(t: Target, force: bool) -> bool:
    readme_path = t.dir_path / "README.md"
    if readme_path.exists() and not force:
        return False

    content = README_TEMPLATE.format(title=title_for(t)).rstrip() + "\n"
    readme_path.write_text(content, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Repository root path (default: .)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing README.md",
    )
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    targets = find_targets(repo_root)

    created = 0
    skipped = 0
    for t in targets:
        if ensure_readme(t, force=args.force):
            created += 1
        else:
            skipped += 1

    print(f"Targets: {len(targets)}, created/updated: {created}, skipped: {skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

