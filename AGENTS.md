---
trigger: always_on
description: プロジェクトの絶対制約とワークフローの起点
---
# Google Antigravity Project Rules (AGENTS.md)

本プロジェクトは「GAS V8 HTMLアプリ開発」に特化したリポジトリです。
このファイルは、各種AIエージェント（Antigravity, Cursor, Copilot等）がプロジェクトの概要と制約を理解するための汎用エントリーポイント（README for Agents）です。

## 1. エージェントの役割とマルチエージェント・ワークフロー
当プロジェクトの開発は、Antigravity 2.0の動的サブエージェント機能を活用し、タスクの負荷に応じた最適なモデルのバケツリレーで進行します。

*   **Thinker (Project Manager / Architect)**: 
    *   要件定義・設計を担う。大規模コンテキストを扱うため `Gemini Pro` クラスの推論モデルを使用する。
*   **Explorer (Codebase Analyst)**: 
    *   Thinkerの指示でコードを探索し、対象の「ファイルパスと行番号（Line Scope）」のみを返す。無駄なトークン消費を抑えるため`flash` モデルを使用する。
*   **Coder (Programmer)**: 
    *   Thinkerの実装計画に基づき、指定された行スコープに対してのみコード修正を行う。`flash` モデルを使用する。

## 2. プロジェクトの絶対制約 (Global Constraints)
*   **Git操作と権限の制限**: AI（Antigravity）はいかなる場合も、自ら `git push`、`git merge`、`git checkout main`、および `clasp push/pull` を実行してはならない。コード改修は常にローカルの `dev` ブランチ上に限定し、`main` へのマージやクラウド(GAS)への同期はすべてユーザーのバッチ処理に委ねること。
*   **コード開発の専念**: デプロイ、ビルド実行、環境構築、実際のGAS環境での動作確認は全てユーザーが行います。エージェントは自らデプロイコマンド等を発行してはなりません。
*   **ファイルパスの維持**: 既存のソースコード（`src/`）や設計書（`docs/`）の配置場所・ディレクトリ構成は絶対に変更せず、指定された既存パス上で作業を行ってください。
*   **最新情報の取得**: 情報収集には必ず最新のWeb検索を行い、基準日とのタイムライン整合性を自己検証した上で正確な情報を取得してください。
*   **完全分業と承認フローの厳守 (Strict Separation of Duties)**:
    *   Thinker（親エージェント）が自らコードを書き換えることは重大なルール違反とする。
    *   いかなる軽微なバグ修正・レイアウト調整であっても、「Thinkerによる計画立案（implementation_plan.md）とユーザー承認」→「Coderによる実装」の正規フローをショートカットしてはならない。

## 3. 詳細ルールの配置場所 (Antigravity Specific)
Antigravity 2.0専用の詳細なロール定義や振る舞い（Rules）、および特定の作業手順（Skills）は以下のディレクトリに格納されています。
*   **Rules**: `.agents/rules/`
*   **Skills**: `.agents/skills/`