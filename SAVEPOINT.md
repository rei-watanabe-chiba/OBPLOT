for gemini
### セーブポイント：OBPLOT1.1 (アーキテクチャ最適化完了)
## 1. システム・アーキテクチャ概要
- **実行環境**: Google Apps Script (V8 runtime)
- **フロントエンド**: HTML Service (Sidebar & Blob URL による別タブ展開)
- **描画・計算ライブラリ**: Apache ECharts (v5.5.1), simple-statistics (v7.8.3)
- **設計パターン**: SPA型 MVMS (Model-View-Method-Service) パターン + Web Components
- **状態管理 (State Management)**: 
  - `AppState` クラスによる Observer (Pub/Sub) パターン。State をセクション単位 (`dataset`, `symbol`, `preview`, `report`) に階層化。
  - フェーズ後退時は `reset()` メソッドを用いて、指定セクションの State を安全に一括初期化。
- **UI & スタイリング思想**: 
  - CSS Nesting構文による明確なスコープ化と階層化。
  - 共通基底クラス（`.scroll-y`, `.form-control`）による DRY なコンポーネント構成。
  - カスタムプロパティ（CSS変数）を活用したボタン・ステータスバーの動的バリアント設計。
  - **Web Components によるUIプリミティブカプセル化**: 
    - `<ob-popover>`: Popover APIのガワとAnchor位置計算を隠蔽。
    - `<ob-multi-select>` / `<ob-symbol-table>`: 宣言的データ注入（DI）で描画されるフォーム要素。
    - `<ob-cal-plot>`: ECharts グラフ描画。
  - **宣言的ビルダー (View -> Component)**: `UIInit` のボイラープレートを撤廃し、ファクトリ関数を用いた構成定義のみでDOMを構築。
- **イベント駆動 & 単方向データフロー**:
  - 静的イベントは HTML 側の `data-action`, `data-change` 属性と `Event` ルーターで処理し、高階関数を用いてハンドラ生成を共通化。
  - UI フェーズ制御は `View` 層の定数マップに基づく宣言的ルール適用エンジン (`UIPhase`) で集約制御。
  - State 更新は DI 経由で Component に注入され、DOM は内部で自動再描画される。
- **非同期通信**: `google.script.run` を Promise ラップした `GasService` クラスによる `async/await` 統一制御。
- **将来的な拡張性（Office Add-in 移植方針）**:
  - 現在の開発主軸は GAS (Google Apps Script) 環境。
  - 将来的に「Office Add-in + GitHub Pages」によるローカル配布型 Excel サイドバーアプリへ移行可能とするため、標準Web技術（Off-line / Local library 化等）に準拠。

---

## 2. ディレクトリ構造・ファイル一覧
- `Code.gs`: バックエンドAPI (データ入出力/UserProperties管理/HTMLテンプレート供給)
- `Sidebar.html`: メインUI構造 (静的actionのハードコード/可読性重視のクリーンなマークアップ)
- `CSS.html`: スタイル・デザイントークン・コンポーネント定義
- `Model.html`: 階層化Stateストア(`AppState`), リセット基盤, API通信(`GasService`), アプリ定数
- `Component.html`: 汎用DOM操作(`DOM`), 汎用動的パーツ生成(`NewDOM`, フェイルセーフ内包)
- `View.html`: UIルール適用エンジン(`UIPhase`), 動的State同期・レンダリング(`UIStateUpdater`, カスタム要素へのDI実行)
- `Chart.html`: グラフ描画Web Component (`<ob-cal-plot>`), ThemeCache, DataRoles統合, Observer監視パイプライン
- `Method.html`: 純粋ビジネスロジック (DOM/API非依存の計算・データ加工・スケール計算・バリデーション)
- `Controller.html`: 非同期フロー制御, ユースケース実行, Stateリセット(ダウングレード)のオーケストレーション
- `Event.html`: イベント委譲ルーター, 高階関数によるバインダ生成, リアクティブバリデーション
- `Report.html`: レポート出力用テンプレート (Blob URL 別タブ展開用)

---

## 3. コア・コントラクト（主要モジュールの責務と制約）
- **[State Store] `AppState` (Model)**: 状態の唯一の源泉。更新は必ず `.set()` を経由し、フェーズ後退等による初期化は `.reset()` を明示的に呼び出す。
- **[UI Rules] `UIPhase` (View)**: フェーズ遷移に伴う UI (活性/非活性/表示) の更新ルールは、命令的な `if` 制御を避け、定数マップ定義に集約する。
- **[UI Renderer] `UIStateUpdater` (View)**: DOM の直接操作は禁止。State を購読 (`subscribe`) し、`NewDOM` やカスタム要素を介して安全に描画・クリーンアップを実行する（描画データはDTOとして注入する）。
- **[Logic] `Method.*` (Method)**: 状態を持たない純粋関数・クラス群。DOM操作や API通信を一切含まず、引数から計算結果を返す役割に徹する。
- **[Event Router] `Evt` (Event)**: イベントの発火元。複雑なビジネスロジックは持たず、高階関数や属性ルーティングを用いてコード量を削減し、`Controller` へ処理を委譲する。
- **[API / Service] `GasService`**: `google.script.run` はベタ書きせず、カスタムエラー対応のPromiseラッパーを使用。`async/await` と `try/catch` による非同期エラーハンドリングを徹底する。

---

## 4. アーキテクチャ・パイプライン（データ経路）
- **[Command Route (ボタン操作等)]**:
  `[User Action] -> (data-action) -> [Evt] -> (Route) -> [Ctrl] <-> (Logic/Fetch) <-> [Method / API] -> (Mutate) -> [AppState.set/reset] -> (Subscribe) -> [UIStateUpdater/UIPhase] -> (Render/DI) -> [NewDOM / <ob-cal-plot>]`
- **[Reactive Route (入力・選択等)]**:
  `[User Input] -> (data-bind / data-change) -> [Evt] -> (Mutate) -> [AppState.set] -> (Subscribe) -> [UIStateUpdater/UIPhase] -> (Render) -> [NewDOM]`

## 5. フェーズ・ステートマシン（状態遷移フロー）
- **[Tab 1: データ抽出]**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
  - ※ `INVALID` または編集検知時、`State.reset(['Tab1ST.exac'])` を実行し、抽出関連 State を初期化してダウングレード。
- **[Tab 2: グラフ作成]**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5)`
  - ※ データロード時: 全 Tab2 関連 State をリセット。
  - ※ Filter (Dataset) 確定時: `State.reset(['Tab2ST.symbol', 'Tab2ST.preview', 'Tab2ST.report'])` を実行し、後続フェーズを初期化。

## 6. 次の開発手順
- CSSのリファクタリング
- 拡張コンポーネントCSSの各項目の記述方法と順序を全体と調整してください
- CSS全体の構成をグループ分けして整理してください
- スクロールの一括定義: 頻出するスクロールエリアに対し、Utility Class（.scroll-y）を作成し、scrollbar-width などの設定をDRY（Don't Repeat Yourself）にしてください
- モダン化による省コード化: calc(var(--unit) * N) を維持しつつ、gap や flex のレイアウト指定を活用て子要素のレイアウト記述を削減してください
- そのほかスクロールような汎用化可能な部分、拡張コンポーネントでネスト構文により共通化可能な部分があれば改修してください
- 現状のUXとフローを大きく崩さない程度の論理構成の変更は許可します（他層の改修も含む）

