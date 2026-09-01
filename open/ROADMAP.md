# ROADMAP.md: OBPLOT1.0 Schema-Driven Refactoring

## 1. SAVEPOINT.md からの主要な変更点

### 1.1 アーキテクチャと状態管理の進化
* **変更前:** UI状態制御は `data-action` や `data-ui` 属性に基づくイベントルーターと相対DOM参照エンジンによって行われていた。また、DOMの再構築や再描画を伴う破壊的な更新が主であった。
* **変更後:** 全層において、`SCHEMA` 定義と `CoreUIAutomator` を中核とする「完全スキーマ駆動アーキテクチャ」に統合。状態変化時はDOMツリーを破壊せず、既存要素のプロパティや属性のみを書き換える「Patch（差分）型同期」を採用。
* **【New】完全な宣言的UIへの昇華:** 値の双方向バインディングのみならず、コンポーネントのソース（`src`）、統計データ（`stats`）、動的フォーム（`fields`）、エラーハイライト（`errs`）、選択肢（`opts`）に至るまで、すべてのDOM操作をカスタム属性（`data-bind-*`）によるリアルタイム監視へ移行。直接的なDOM操作（`getElementById`等）を全廃した。

### 1.2 ファイル構成・モジュール責務の再編 (A, B, Cへの分離)
システムの責務を「汎用コア（A）」と「独自ツール（B/C）」に明確に分割する。

* **A（共通コアエンジン）**:
    * `CoreModel.html`: `AppState` 基盤の提供。
    * `PlatformAdapter.html`: 通信（GAS/Excel）と永続化のインターフェース・DIを集約。
    * `CoreAction.html`: グローバルイベントルーター（委譲）、非同期ロック、システム基盤（初期化・バックアップ）を一手に担う。**【New】DIリゾルバによる依存性注入を実装し、ドメイン固有の名前空間から完全に独立。**
    * `CoreUIAutomator.html`: 全層共通の差分同期エンジン。バインディングとフェーズ評価（Phase-Aware）を統括。
    * `CoreMethod.html`: 回帰計算、スケール計算など、ドメインに依存しない純粋な共通ユーティリティ。
    * `Component.html`, `Chart.html`, `CSS.html`: 全環境共通のUIコンポーネント群。
* **B（Tab1, 2 特化ツール / Tracer5i用）**:
    * `Sidebar_Tracer.html`: B専用のUI静的骨格。
    * `T1T2_Schema.html`: フェーズ制約（`activePhase`, `disablePhase`等）を内包したDOM定義配列。
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
  * **DIの確立:** `CoreAction` に `configResolver` を導入。汎用コアが「どのツールが動いているか」を知ることなく、B/C側から動的にスキーマや状態パスを注入する設計を確立。これにより、単一HTML内での複数アプリの同居と、将来のコアライブラリ化を両立させた。
  * **アクション・パイプラインのカプセル化:** 「ダイアログによる確認 → ローディングUIの展開 → 非同期処理のロック → 成功/エラー時のUI復元」という一連の定型フローを `CoreAction.confirmAndExecute` として完全にカプセル化。Action層から制御構文を排除し、純粋なビジネスロジックのみを記述できる構造へ進化した。
  * **フェーズ制約の分離:** `activePhase` (ハイライト) と `disablePhase` (非活性化) の評価軸を分離し、より柔軟かつ厳密な宣言的UI制御を実現した。

### Phase 3: ダッシュボード (Tab3) 動作検証とビルドパイプライン分割 【Next】
* **タスク**:
  1. 確立されたDI基盤と宣言的UIアーキテクチャの上で、C用ファイルの動作検証を実施。
  2. `infra/build.js` を改修し、独立出力させる。マニフェストを分割・最適化する。

### Phase 4: GASライブラリ化の確立と総合テスト
* **タスク**:
  1. コアエンジン (A) を独立したGASプロジェクト（非公開ライブラリ）としてデプロイ。
  2. 配布用テンプレート側からライブラリ参照し、HTML生成の中継を実装。
