---
name: html_standard
description: プロジェクト固有の data-* アーキテクチャ（id/class撲滅）によるHTML宣言的UIの標準規約。Thinkerが設計・レビューを行う際に使用します。
---

# HTML Coding Standard & WHATWG Compliance

## 1. Project HTML Standard (data-* アーキテクチャ)
本プロジェクトは、HTMLとJSの責務を完全に分離した「宣言的UI」を採用しています。デッドコード削除のリファクタリングおよびコードレビュー時は、以下のレガシー排除ルールを厳格に適用してください。

### 【重要】レガシー排除ルール
1.  **idの完全撲滅**: JSロジックにおける `id` 属性の使用（`getElementById`等）を禁止。要素の特定は役割に応じた `data-part` 等で行う。
2.  **HTML classの純粋なCSSリンク化**: `class` 属性はCSS装飾のためだけに使用。JSロジックでの `querySelector('.className')` 等の利用は絶対禁止。

### data-* アーキテクチャ分類
*   **① イベント・アクション**: `data-action` (イベント統合), `data-param` (引数)
*   **② 状態・値バインディング**: `data-out` (State同期・リアクティブ購読), `data-opts` (汎用オプション)
*   **③ マウント・構造特定**: `data-ui` (ウィジェット種別), `data-part` (純粋なクエリ用マーカー)

### コードレビュー基準 (Thinker向け)
Coder から提出されたコード内に `el.value = ""` などの命令的なDOM書き換えや、CSSクラスに依存したロジックが含まれていた場合、即座に差し戻して `State` 更新と `CoreUI` パッチ処理（Stateless Patcherパラダイム）に修正させてください。

## 2. WHATWG HTML Specification Compliance
HTMLの要素定義や構文を評価する際は、最新の WHATWG 仕様 (https://html.spec.whatwg.org/) を基準とします。自己判断で不正な属性を付与しないよう検証してください。
