# SAVEPOINT.md: OBPLOT1.0

## 1. システム・アーキテクチャ（設計思想とパラダイム）
- **実行環境**: Google Apps Script (V8 runtime) / HTML Service (Sidebar & Blob URL)
- **コア・パラダイム**: SPA型 MVMS (Model-View-Method-Service) + Web Components + Presenter パターン
- **状態管理 (Single Source of Truth)**: 
  - `AppState` による厳格なObserver (Pub/Sub) モデル。状態はセクションごとに階層化。軽量な refs と phase のバックアップと再起動時検証。
  - **[Why]**: DOMを状態の正とせず、Stateの変更のみがUIを駆動する（単方向データフロー）ことで、予測不可能な副作用を排除する。
  - **[How]**: 状態取得時の冗長性を排除するため、Proxy 経由の分割代入を利用する。各セクションの初期状態は階層スキーマとして厳格に保証する。
- **プレゼンテーション (Phase-Aware Schema & Patch-based Binding)**: 
  - **[Why]**: DOMの破壊的再構築はWeb Componentsの参照ロストを引き起こし、命令的なDOM操作は保守性のボトルネックとなるため。
  - **[How]**: 各画面専用の `SCHEMA` オブジェクトにフェーズ制約（`activePhase`, `disablePhase` 等）を宣言。同時に `data-bind-*` 属性を用いて、値、選択肢、コンポーネントソース、動的フォームなどをすべて宣言的にバインディングし、`CoreUIAutomator` を介してリアルタイムかつ差分のみをPatch同期する。
- **汎用コアの完全抽象化 (Dependency Injection)**:
  - **[Why]**: 将来的にコア層（A）を独立したライブラリとして配布するためには、コア内部から特化ツール（B/C）固有の知識（ドメインや名前空間）を完全に排除する必要があるため。
  - **[How]**: `CoreAction` に `configResolver` を実装。ツール（呼び出し元）側が初期化時に「自身の設定」を注入（DI）することで、コア側には一切の分岐処理を持たせないアーキテクチャを実現する。
- **配布・拡張性 (Library & Add-in Portability)**:
  - **[Why]**: 全環境（GAS / Excel）での同一コードによる単一管理と、最新ロジックの一括配信を実現するため。
  - **[How]**: 通信と永続化は `PlatformAdapter.html` 内のAdapterを用いて動的吸収。GitHub Actionsによるビルドで、環境依存コードを含まない純粋な静的HTMLを生成する。

## 2. マルチ環境実装原理
- **環境差異の吸収**: `typeof Office !== 'undefined'` 等による環境検知を用い、API (通信) と Storage (永続化) を環境ごとにAdapter（`PlatformAdapter.html`）で切り替える。
- **自動ビルド・デプロイ機構**:
  - `infra/build.js` により、ツール（Tracer / Dashboard）ごとに最適化された単一のファイルへ結合する。
  - **[Why]**: Excel環境特有のCSP制限を排除し、安全にアドインとして配信するため。ブラウザパーサーの `<script>` 分断回避のための文字列エスケープもビルド側で徹底する。

## 3. コア・コントラクト（絶対的制約とコーディング規約）
1. **ビジネスロジックの純粋化 (Method層への一元化)**:
   - **[Why]**: テスト容易性と保守性の担保。処理の重複を防ぐ。
   - **[Rule]**: DOM APIやGAS通信 (`API.fetchData`等) を一切混入させず、ドメイン固有処理は `T1T2_Method` / `T3_Method` へ、汎用計算は `CoreMethod` へ完全分離する。
2. **派生状態（Derived State）の厳守**:
   - **[Why]**: アクション内で直接DOMを書き換えるレガシー処理は、単方向データフローのアーキテクチャと競合し、UIの不整合を生むため。
   - **[Rule]**: ユーザー操作やAPIから得た生データを元に、UI表示用のデータ（選択肢リストやグラフソース等）を計算し、それを `State` の別パス（派生状態）として保存する。画面の描画はすべてバインディングに委譲する。
3. **アクション・パイプラインの統合利用**:
   - **[Why]**: 確認ダイアログやステータス制御のロジックが各所に散在すると、コードの肥大化と復元（Undo）漏れのリスクが生じるため。
   - **[Rule]**: 確認ダイアログと非同期処理（ロック、ローディング、実行、エラーハンドリング）を伴うアクションは、必ず `CoreAction.confirmAndExecute` を経由して実行する。
4. **ステートレス化とイミュータブル処理**:
   - **[Rule]**: ループ内でのミュータブルな状態更新を避け、`reduce` と高階関数を用いたパイプライン処理に統合する。
5. **モダン構文と組み込み仕様によるコード削減**:
   - **[Rule]**: オプショナルチェイニング (`?.`)、Null合体演算子 (`??`)、分割代入を活用し、冗長な guards や `length === 0` 判定を排除する。
6. **厳格なコメント・フォーマット規約**:
   - **[Rule]**: クラスやメソッド間、ブロック間の**空行（ブランク行）は完全に削除**し、情報密度を最大化する。処理の意図（Why）を短いコメントで付与する。

## 4. アーキテクチャ・パイプライン（データフロー）
- **[アクション基盤]**: `User Action` -> `CoreAction (Global Router & Confirm/Lock Pipeline)` -> `Domain Action` <-> `API / CoreMethod`
- **[UI同期基盤]**: `State.set` -> `CoreUIAutomator` -> `[Subscribe & Patch Binding (src/opts/fields...)]` -> `Web Components / DOM`

## 5. フェーズ・ステートマシン（状態遷移定義）
- **Tab 1 (データ抽出)**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
- **Tab 2 (グラフ作成)**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5)`
- **Tab 3 (ダッシュボード)**: `INIT(1) -> LOADED(2)`
- **[Why]**: フェーズ遷移に伴うUIの表示/非活性制御を命令的な `if` 分岐で分散させないため。
- **[How]**: スキーマ（`T1T2_SCHEMA` 等）に各要素が稼働すべきフェーズ（`activePhase`, `disablePhase`, `visiblePhase`）を関数として宣言し、`CoreUIAutomator` が現在フェーズを評価して一括でDOM属性を制御する。

## 6. ディレクトリ構造と関数一覧（モジュール責務）
- `Code.js`: [API] バックエンドAPI (GAS通信, I/O, サイドバー起動)
- `PlatformAdapter.html`: [Infra] API/Storageのアダプター・環境DI
- `CoreModel.html`: [Model] 状態管理 (`AppState`)・グローバル定数
- `CoreAction.html`: [Controller] システム基盤（ルーター、統合パイプライン、バックアップ、初期化DIリゾルバ）
- `CoreUIAutomator.html`: [View Engine] スキーマに基づくPatch型差分同期エンジン・リアルタイムバインダー
- `CoreMethod.html`: [Logic] 汎用ユーティリティ（計算・配列操作）
- `Component.html`: [Component] DOMビルダー・Web Components・Lazy Dialog Injection
- `Chart.html`: [Component] グラフ描画 (`<ob-cal-plot>`)
- **[Tab1/Tab2 特化モジュール]**:
  - `Sidebar_Tracer.html` / `T1T2_Schema.html` / `T1T2_Action.html` / `T1T2_Method.html`
- **[Tab3/Report 特化モジュール]**:
  - `Sidebar_Dash.html` / `T3_Sidebar_Schema.html` / `T3_Action.html` / `T3_Method.html`
  - `Report.html` / `Report_Schema.html` / `ReportApp.html` / `ReportCSS.html`

## 7. 開発状況と次ステップ
- **現在の状況**: Phase 2 完了。汎用コアのDI化および宣言的UI制御の完全移行を達成し、Tab1・Tab2層の安定動作を確認。
- **次ステップ**: Tab3（ダッシュボード・レポート層）の改修および動作確認。
