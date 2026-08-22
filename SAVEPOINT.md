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
- **UI & レンダリング思想**: 
  - HTML の可読性を重視したクリーンな DOM 構造。
  - **Web Components カプセル化**: カスタム要素を用いて機能単位を隠蔽し、外部からの干渉を排除。
  - **State連動UI**:  Stateリセット時の自動クリーンアップ（フェイルセーフ機構）を内包。
  - **DIグラフ描画**: グラフ描画コンポーネント内部からのグローバル State への直接参照を禁止し、単方向データフローを徹底。
- **イベント駆動 & 単方向データフロー**:
  - 静的イベントは HTML 側の `data-action` 属性と `Event` ルーターで処理し、高階関数を用いてハンドラ生成を共通化。
  - UI フェーズ制御は `View` 層の定数マップに基づく宣言的ルール適用エンジン (`UIPhase`) で集約制御。
- **非同期通信**: `google.script.run` を Promise ラップした `GasService` クラスによる `async/await` 統一制御。
- **将来的な拡張性（Office Add-in 移植方針）**:
  - **現在の開発主軸は GAS (Google Apps Script) 環境である。**
  - 将来的に「Office Add-in + GitHub Pages」によるローカル配布型 Excel サイドバーアプリへ移行する意図を持つ。
  - GAS通信（`GasService` / `Code.js`）以外の層（UI、状態管理、計算・描画ロジック）は、高い移植性と標準Web技術（Off-line / Local library 化等）への準拠を考慮して実装・ライブラリ選定を行う。

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
**[Tab 1: データ抽出]**
`INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
※ `INVALID` または編集検知時、`State.reset(['Tab1ST.exac'])` を実行し、抽出関連 State を初期化してダウングレード。
**[Tab 2: グラフ作成]**
`INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5)`
※ データロード時: 全 Tab2 関連 State をリセット。
※ Filter (Dataset) 確定時: `State.reset(['Tab2ST.symbol', 'Tab2ST.preview', 'Tab2ST.report'])` を実行し、後続フェーズを初期化。

## 6. 次の開発手順
- 改修したシンボルセクションのリファクタリング
- 現状のフローで動作確認しているが、設計思想とのすり合わせ、保守性向上、コード省略を検討する
- 検討結果から検討項目を評価軸とする改修アプローチを５つ提案し、ユーザーとの対話でアプローチを洗練化
- アプローチを決定して実装
- 実装後、プレビューセクションにシンボル属性を反映させるリファクタリングに移行する。

