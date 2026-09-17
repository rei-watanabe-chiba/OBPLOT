---
name: gas_v8_workflow
description: GAS V8プロジェクトにおける、実装計画（implementation_plan.md）の作成および開発ログ（development_log.md）の記録に関する標準ワークフロー。機能追加やリファクタリングの計画策定時に使用します。
---

# GAS V8 Development Workflow (Artifact Management)

当プロジェクトの「動的サブエージェント召喚（Thinker -> Explorer -> Coder）」の基盤フローは `.agents/rules/` に移譲されました。本スキルは、タスク進行時における**アーティファクト（成果物・ログ）の厳格な管理手法**を定義します。

## 1. 計画策定とスコープ定義 (Implementation Plan)
*   **ファイル**: `clasp/artifacts/implementation_plan.md`
*   **用途**: Coderに渡す「設計と修正範囲」の指示書。
*   **最適化ルール**:
    *   ファイル全体を書き換えさせるような大雑把な指示は禁止。
    *   必ず Explorer の報告を活用し、`#### [MODIFY] [Code.js](file:///c:/.../src/Code.js#L150-L180)` のように **Line Scope（行範囲）** を厳密に指定し、Coderのトークン消費を最小化すること。

## 2. 開発履歴の記録 (Development Log)
*   **ファイル**: `clasp/artifacts/development_log.md`
*   **用途**: 発生した課題、解決策、後方互換廃止の履歴などのナレッジ蓄積。
*   **最適化ルール**:
    *   セッションが終了する前、または大きなフェーズ（デッドコード削除など）が完了した際に必ず追記すること。
    *   ユーザーへの報告時、このログへのリンクを提示してプロジェクトの進捗と変更意図を明示すること。

## 3. 設計書 (docs/) の同期
*   `clasp/docs/` 内のアーキテクチャ設計に影響を与える変更（新たな `data-*` 属性の追加や既存ルールの廃止など）を行った場合は、必ずユーザーの事前承認を得てからドキュメントを更新すること。
