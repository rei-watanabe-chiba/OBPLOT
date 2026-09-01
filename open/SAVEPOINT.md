# SAVEPOINT.md: OBPLOT1.0

## 1. システム・アーキテクチャ（設計思想とパラダイム）
- **実行環境**: Google Apps Script (V8 runtime) / HTML Service (Sidebar & Blob URL)
- **コア・パラダイム**: SPA型 MVMS (Model-View-Method-Service) + Web Components + Presenter パターン
- **状態管理 (Single Source of Truth)**: 
  - `AppState` による厳格なObserver (Pub/Sub) モデル。状態はセクションごとに階層化。軽量な refs と phase のバックアップと再起動時検証。
  - **[Why]**: DOMを状態の正とせず、Stateの変更のみがUIを駆動する（単方向データフロー）ことで、予測不可能な副作用を排除する。
  - **[How]**: 状態取得時の冗長性を排除するため、Proxy 経由の分割代入を利用する。各セクションの初期状態は階層スキーマとして厳格に保証する。
- **プレゼンテーション (Phase-Aware Schema & Patch-based Binding)**: 
  - **[Why]**: DOMの破壊的再構築（`replaceChildren`等）は、Web Componentsの内部状態やイベントリスナーの参照ロスト（UI凍結）を引き起こす。また、命令的なDOM操作は保守性のボトルネックとなるため。
  - **[How]**: 各画面専用の `SCHEMA` オブジェクトに、UI構造だけでなくフェーズ制約（`activePhase`, `visiblePhase`）も宣言的に内包させる。汎用エンジン `CoreUIAutomator` は、State変更を検知するたびに既存DOM要素を破棄せず、差分プロパティや属性の書き換えのみ（Patch同期）を全自動で実行し、ライフサイクルを保護する。
- **グラフレンダリングと精密レイアウト制御**:
  - **[Why]**: EChartsの動的描画において、ユーザー設定の余白（絶対値）とウィンドウサイズ（相対値）の衝突による「ラベルの見切れ」を防ぎ、WYSIWYGを保証するため。
  - **[How]**: `Chart.html` が文字サイズに基づき自律的に「安全マージン」を確保。出力画面ではCSS Grid (`place-items: center`) と連携してミリ単位の中央配置を強制する。
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
2. **ステートレス化とイミュータブル処理**:
   - **[Why]**: 外部変数の書き換え（副作用）によるバグを防ぐため。
   - **[Rule]**: ループ内でのミュータブルな状態更新を避け、`reduce` と高階関数を用いたパイプライン処理に統合する。
3. **モダン構文と組み込み仕様によるコード削減**:
   - **[Rule]**: オプショナルチェイニング (`?.`)、Null合体演算子 (`??`)、分割代入を活用し、冗長な guards や `length === 0` 判定を排除する。
4. **命名規則の厳守とStateスキーマの画一化**:
   - **[Rule]**: 各セクションのStateは `{ status, data, refs, flags }` の共通階層構造（スキーマ）に強制統一する。高度な短縮形（`raw`, `extr`, `prev`, `symb`等）でシステム全体を統一する。
5. **厳格なコメント・フォーマット規約**:
   - **[Rule]**: クラスやメソッド間、ブロック間の**空行（ブランク行）は完全に削除**し、情報密度を最大化する。処理の意図（Why）を短いコメントで付与する。

## 4. アーキテクチャ・パイプライン（データフロー）
- **[アクション基盤]**: `User Action (click/change) -> CoreAction (Global Router) -> Domain Action (T1Action等) <-> API / CoreMethod`
- **[UI同期基盤]**: `State.set -> CoreUIAutomator.update() -> [Patch Binding & Phase Evaluation] -> Web Components (DOM)`

## 5. フェーズ・ステートマシン（状態遷移定義）
- **Tab 1 (データ抽出)**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
- **Tab 2 (グラフ作成)**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5)`
- **Tab 3 (ダッシュボード)**: `INIT(1) -> LOADED(2)`
- **[Why]**: フェーズ遷移に伴うUIの表示/非活性制御を命令的な `if` 分岐で分散させないため。
- **[How]**: スキーマ（`T1T2_SCHEMA` 等）に各要素が稼働すべきフェーズ（`activePhase`, `visiblePhase`）を関数として宣言し、`CoreUIAutomator` が現在フェーズを評価して一括でDOM属性を制御する。

## 6. ディレクトリ構造と関数一覧（モジュール責務）
- `Code.js`: [API] バックエンドAPI (GAS通信, I/O, サイドバー起動)
- `PlatformAdapter.html`: [Infra] API/Storageのアダプター・環境DI
- `CoreModel.html`: [Model] 状態管理 (`AppState`)・グローバル定数
- `CoreAction.html`: [Controller] システム基盤（ルーター、非同期ロック、バックアップ、初期化）
- `CoreUIAutomator.html`: [View Engine] スキーマに基づくPatch型差分同期エンジン
- `CoreMethod.html`: [Logic] 汎用ユーティリティ（計算・配列操作）
- `Component.html`: [Component] DOMビルダー・Web Components (ライフサイクル保護対応)
- `Chart.html`: [Component] グラフ描画 (`<ob-cal-plot>`)
- **[Tab1/Tab2 特化モジュール]**:
  - `Sidebar_Tracer.html` / `T1T2_Schema.html` / `T1T2_Action.html` / `T1T2_Method.html`
- **[Tab3/Report 特化モジュール]**:
  - `Sidebar_Dash.html` / `T3_Sidebar_Schema.html` / `T3_Action.html` / `T3_Method.html`
  - `Report.html` / `Report_Schema.html` / `ReportApp.html` / `ReportCSS.html`

## 7. 開発状況と次ステップ
- **現在の状況**: Phase 2（特化型ツールのスキーマ駆動化と完全分離）完了。
- **次ステップ**: Phase 3（ビルドパイプライン改修とマニフェスト分割）への移行。
