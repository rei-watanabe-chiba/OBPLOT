---
name: gas_v8_coding
description: GAS (Google Apps Script) V8エンジン環境に最適化されたコーディング規約。Coderがコード修正を行う際に適用します。
---

# GAS V8 Coding Rules & Best Practices

## 🎯 実行時の絶対制約 (Line Scope Focus)
*   **ピンポイント適用の原則**: 本規約は、Thinkerから指定された「修正対象の行範囲（Line Scope）」に対してのみ適用してください。関係のない周囲の既存コードまで本規約に合わせるために（無断で）リファクタリングしてはいけません。無駄な差分とトークン消費を防ぎます。

## ⚙️ Execution Rules

### 1. Modern JavaScript (V8 Engine)
*   **ES6+ 記法の遵守**: `const`, `let`, アロー関数, 分割代入, テンプレートリテラルを積極的に使用すること。
*   **レガシー構文の禁止**: 明確な理由がない限り `var` の使用は厳禁。

### 2. Client-Side Asynchronous Patterns
*   **Promise Wrapper**: クライアントサイドの `google.script.run` は Promise を返さないため、必要に応じて `async/await` で扱えるように Promise でラップする実装パターンを適用すること。

### 3. Secure Coding
*   **XSS / Injection 対策**: ユーザー入力を用いて動的にHTMLを生成する場合は、必ず適切なサニタイズ（エスケープ）処理を実装すること。

### 4. File Environment Constraints
*   GAS環境（clasp）へのインポートを前提とし、サーバーサイドは `.gs` または `.js`、クライアントサイドは `.html` とすること。
*   ※デプロイ用スクリプト等の環境構築コードは絶対に生成しないでください（純粋なアプリケーションコードのみに専念）。
