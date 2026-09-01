# ROADMAP.md: OBPLOT1.0 Schema-Driven Refactoring

## 1. SAVEPOINT.md からの主要な変更点

### 1.1 アーキテクチャと状態管理の進化
* **変更前:** UI状態制御は `data-action` や `data-ui` 属性に基づくイベントルーターと相対DOM参照エンジンによって行われていた。また、DOMの再構築や再描画を伴う破壊的な更新が主であった。
* **変更後:** 全層において、`SCHEMA` 定義と `CoreUIAutomator` を中核とする「完全スキーマ駆動アーキテクチャ」に統合。状態変化時はDOMツリーを破壊せず、既存要素のプロパティや属性のみを書き換える「Patch（差分）型同期」を採用。これにより、Web Componentsのライフサイクル（内部IDやアンカー紐付け）を永続的に保護する。

### 1.2 ファイル構成・モジュール責務の再編 (A, B, Cへの分離)
システムの責務を「汎用コア（A）」と「独自ツール（B/C）」に明確に分割する。

* **A（共通コアエンジン）**:
    * `CoreModel.html`: `AppState` 基盤の提供。
    * `PlatformAdapter.html`: 通信（GAS/Excel）と永続化のインターフェース・DIを集約。
    * `CoreAction.html`: グローバルイベントルーター（委譲）、非同期ロック、システム基盤（初期化・バックアップ）を一手に担う。
    * `CoreUIAutomator.html`: 全層共通の差分同期エンジン。バインディングとフェーズ評価（Phase-Aware）を統括。
    * `CoreMethod.html`: 回帰計算、スケール計算など、ドメインに依存しない純粋な共通ユーティリティ。
    * `Component.html`, `Chart.html`, `CSS.html`: 全環境共通のUIコンポーネント群。
* **B（Tab1, 2 特化ツール / Tracer5i用）**:
    * `Sidebar_Tracer.html`: B専用のUI静的骨格。
    * `T1T2_Schema.html`: フェーズ制約（`activePhase`等）を内包したDOM定義配列。
    * `T1T2_Action.html`: データ抽出・検量線パイプラインの非同期コントローラー。
    * `T1T2_Method.html`: Tracer固有のデータ変換・ビジネスロジック。
* **C（Tab3 汎用ツール / Dashboard用）**:
    * `Sidebar_Dash.html` / `Report.html`: サイドバー用とレポート本体用の独立したUI骨格。
    * `T3_Sidebar_Schema.html` / `Report_Schema.html`: サイドバー側とレポート側のコンテキスト衝突を防ぐための独立スキーマ。
    * `T3_Action.html` / `ReportApp.html`: ダッシュボード向けのコントローラーとエントリーポイント。
    * `T3_Method.html`: 汎用レポートデータ生成ロジック。

### 1.3 実行環境・ビルドパイプラインの変更
* **変更前:** 単一の `App.html` を生成し、URLパラメータで擬似的に切り替えていた。
* **変更後:** `infra/build.js` を改修し、A+Bの結合である `App_Tracer.html` と、A+Cの結合である `App_Dash.html` を完全に独立して出力する。Excel用マニフェストも2系統に分離。

---

## 2. リファクタリング・ロードマップ（段階的稼働テスト）

### Phase 1: コアエンジン (A) の抽出と統合基盤の構築 【完了】
* `Controller`, `Event`, `View`, `Method` から共通機能を抽出し、インフラ・基盤クラス群（`CoreAction`, `CoreUIAutomator`, `CoreMethod`, `PlatformAdapter`）を確立。

### Phase 2: 特化型ツール (B/C) のスキーマ駆動化と完全分離 【完了】
* **達成されたブレイクスルー**: 
  * 「フェーズの降格（戻り）」が発生した際、DOMの破壊的再構築（`replaceChildren`等）に起因してWeb Componentsの参照がロストする（UIが凍結する）問題に対し、アーキテクチャレベルでの解決を図った。
  * `CoreUIAutomator` を Patch型差分同期 に改修し、同時にフェーズ制約（旧 `UIPhase` のルール）を `activePhase` / `visiblePhase` 等として直接 SCHEMA 内部に宣言する（Phase-Aware Schema）構成へ刷新。泥臭いDOM参照処理を根絶し、セキュアな双方向バインディングを確立した。

### Phase 3: ビルドパイプラインとマニフェストの分割 【Next】
* **タスク**:
  1. `infra/build.js` を改修し、B用 (`App_Tracer.html`) と C用 (`App_Dash.html`) を独立して出力する。
  2. `manifest.xml` を用途別に分割・最適化する。
* **動作確認**:
  * ローカルビルド後、生成されたHTMLに固有スキーマが正しく注入されているか確認。
  * Web版Excelにマニフェストを登録し、独立して起動するかテスト。

### Phase 4: GASライブラリ化の確立と総合テスト
* **タスク**:
  1. コアエンジン (A) を独立したGASプロジェクト（非公開ライブラリ）としてデプロイ。
  2. 配布用テンプレート側からライブラリ参照し、HTML生成の中継を実装。
