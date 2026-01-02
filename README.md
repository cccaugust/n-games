# N-Games Project 🎮

小学生の子供と一緒に作る、遊ぶ！ブラウザゲームポータルサイトプロジェクトです。
AIエージェント「Antigravity」と一緒に開発を進めていきます。

## プロジェクト概要

*   **目的**: 子供と一緒にゲーム作りを楽しみながら、Pokiのようなゲームポータルサイトを構築する。
*   **Live Site**: [https://cccaugust.github.io/n-games/](https://cccaugust.github.io/n-games/) 🚀
*   **プラットフォーム**: GitHub Pages (本リポジトリ: `https://github.com/cccaugust/n-games.git`)
*   **ターゲット**: 自分たち家族（親と小学生の子供）

## 機能要件

1.  **ゲームポータル**: 複数の自作ブラウザゲーム一覧から遊びたいゲームを選べるUI。
2.  **ログイン機能**:
    *   身内用なので簡易的な認証。
    *   **ID** と **4桁の数字パスワード** でログイン。
3.  **セーブ機能**:
    *   Supabaseを利用して、ゲームの進行状況やハイスコアをクラウドに保存。
4.  **ドット絵メーカー（準備中）**:
    *   キャラ/モノ/地形のドット絵を作成・保存し、将来いろんなゲームで使える共通アセットにする。

## 技術スタック

*   **Frontend**: Vite + Vanilla JS (or React/Vue if preferred later)
    *   **Reason**: モダンな開発環境で、高速な動作とリッチな表現が可能。ビルドしてGitHub Pagesにデプロイします。
*   **Backend**: Supabase (Authentication, Database)
*   **Hosting**: GitHub Pages (GitHub Actionsでビルド＆デプロイ)


## 開発スタイル

*   AIとのペアプログラミング。
*   楽しく、わかりやすく！

## マルチデバイス（レスポンシブ）方針（重要）

このプロジェクトのゲームは **PC/タブレット/スマホで「ズレずに遊べる」** ことを必須にします。特にスマホは表示崩れが起きやすいので、後付けではなく **最初からレスポンシブ前提**で実装します。

- **必須（全ゲーム/ページ）**
  - `index.html` に viewport を入れる（例：`width=device-width, initial-scale=1, viewport-fit=cover`）
  - 固定pxに寄せすぎず、狭い画面で自然に詰まるCSSにする（`%` / `rem` / `clamp()` 等）
  - タッチ操作は Pointer Events を基本にし、スクロール抑制は必要な範囲だけ（ゲームエリア等）
  - iPhone等のノッチ/ホームバーを考慮してセーフエリアにUIが食い込まないようにする
  - **スマホ（縦/横）+ タブレット + PC幅** で最低限の目視確認をする

詳細ルールは `.cursor/rules/10-frontend-games.mdc` を参照してください。

## ゲームごとの設計メモ（重要）

各ゲーム/ページのフォルダ直下に `README.md` を置き、概要・操作・ルール・主要ロジック・既知の課題を短くまとめます。  
ゲームを修正したときは、仕様に変更があれば **同じ変更で `README.md` も更新**します。

## デバッグ機能

開発者やデバッグ用に、以下の隠しメニューが用意されています。

*   **デバッグメニュー**: `/src/debug/` (ローカル開発時は `http://localhost:5173/src/debug/`)
    *   各種ツールのテストやエミュレータへのアクセスに使用します。


---
*Created with ❤️ by Antigravity & Family*
