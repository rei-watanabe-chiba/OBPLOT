### セーブポイント：OBPLOT1.1 (アーキテクチャ最適化完了)

## 1. システム・アーキテクチャ概要
- **実行環境**: Google Apps Script (V8 runtime)
- **フロントエンド**: HTML Service (Sidebar & Blob URL による別タブ展開)
- **描画・計算ライブラリ**: Google Visualization API (CoreChart: ScatterChart), simple-statistics (v7.8.3)
- **設計パターン**: SPA型 MVMS (Model-View-Method-Service) パターン
- **状態管理 (State Management)**: 
  - `AppState` クラスによる Observer (Pub/Sub) パターン。
  - State 定数をセクション単位 (`dataset`, `symbol`, `preview`, `report` 等) に階層化。
  - フェーズ後退（ダウングレード）時は `reset()` メソッドにより、指定セクションの State をディープコピーで安全に一括初期化。
- **UI & レンダリング思想**: 
  - Google Material Design 準拠、CSS Grid レイアウト。
  - HTMLの可読性を維持しつつ、最低限のカスタム属性によるUI制御を行うハイブリッド設計。
  - **動的クリーンアップ (Fail-Safe)**: State が空 (`null`, `[]`) に変更された際、コンテナ要素を自動的に消去/プレースホルダー表示へ切り替え。
- **イベント駆動 & 単方向データフロー**:
  - **Static Action**: 静的要素（ボタン等）は `data-action` 属性によるイベント委譲（`Event` ルーター）。
  - **Reactive Action**: 状態変更による UI の活性/非活性・表示制御は、`View` 層の定数マップ（`TAB1_RULES`, `TAB2_RULES`）に基づく宣言的ルール適用エンジン (`UIPhase`) で集約制御。
  - **高階関数化**: 類似イベントハンドラはファクトリ関数で生成し、コード量を大幅削減。
- **ビジネスロジック分離**: `Method.html` 内の純粋関数/クラスとして完全にカプセル化（DOM・GAS API 非依存）。
- **非同期通信**: `google.script.run` を Promise ラップした `GasService` クラスによる `async/await` 統一制御。

---

## 2. ディレクトリ構造とコンポーネント責務

src/
├── Code.gs             # バックエンドAPI: データ入出力、UserProperties、HTMLテンプレート供給
├── Sidebar.html        # メインUI構造: サイドバー、動的コンテナ、Template要素、静的data-*属性
├── CSS.html            # デザイントークン、レイアウト、コンポーネントスタイル
├── Model.html          # 状態ストア(AppState)、定数定義(GLOBAL_CONFIG)、通信層(GasService/API)
├── Component.html      # DOMユーティリティ(DOM)、汎用動的パーツ生成・描画(NewDOM)
├── View.html           # 静的初期化(UIInit)、フェーズ連動ルールエンジン(UIPhase)、State同期(UIStateUpdater)
├── Method.html         # 純粋ビジネスロジック(DataUtils, FileValidator, DataExtractor, PxrfValidator, DataManager, PreviewManager, CalcProcessor)
├── Controller.html     # 非同期処理の直列化(CoreCtrl)、ユースケース制御・Stateリセットオーケストレーション(Tab1Ctrl, Tab2Ctrl)
├── Event.html          # イベントルーティング、高階関数生成バインダ、リアクティブバリデーション(Evt)
└── Report.html         # レポート出力用テンプレート (別タブ展開用)

---

## 3. 状態遷移とリセット仕様 (State Reset Map)

アプリケーションの進行フェーズ (`TAB1_PHASE`, `TAB2_PHASE`) に連動し、Controller から明示的にリセットを実行。

[Tab 1]
  INIT(1) ──> READY(2) ──> LOAD(3) ──> INVALID(4) ──> VALID(5) ──> EXTRACT(6) ──> OUTPUT(7)
                                          │
                                          └── [再検証/編集検知] ──> State.reset(['Tab1ST.exac'])

[Tab 2]
  INIT(1) ──> LOADED(2) ──> FILTERED(3) ──> MAPPED(4) ──> PREVIEWED(5)
                  │               │               │
                  ├─ [再ロード]    ├─ [Filter確定]  └─ [Preview作成]
                  │   Reset All   │   Reset Symbol/   Reset Report
                  │               │   Preview/Report
                  └───────────────┴───────────────────────────────> State.reset([...])

---

## 4. コンポーネント間依存関係 (Data Flow)

[User Action] ──> Event.html (Evt) ──> Controller.html (Ctrl)
                                             │
                                     (API Call / Method Logic)
                                             │
                                             ▼
                                     Model.html (AppState.set / reset)
                                             │
                                   (Pub/Sub Notification)
                                             │
                                             ▼
                                     View.html (UIStateUpdater / UIPhase)
                                             │
                                             ▼
                                     Component.html (NewDOM) ──> [DOM Render]

---

## 5. 主要クラス・オブジェクト一覧

### Model.html
- `GLOBAL_CONFIG`: アプリケーション定数（シート名、フィールド定義、インデックスマップ）
- `Tab1UI` / `Tab2UI`: DOM ID マッピング定数
- `TAB1_PHASE` / `TAB2_PHASE`: アプリケーション状態フェーズ定数
- `AppState` (instance: `State`): 状態管理クラス (`get`, `set`, `subscribe`, `reset`)
- `GasService` (alias: `API`): `google.script.run` Promise ラッパークラス

### Component.html
- `DOM`: 低レイヤー DOM 操作ユーティリティ (`get`, `setDOM`, `toggle`, `open`, `setDisabled`, `setAttr`)
- `NewDOM`: コンポーネントレンダリングクラス (`status`, `confirm`, `selectors`, `symbolRows`, `statsTable`, `multiSelectDropdown`, `inputs`)

### View.html
- `UIInit`: 静的初期要素の生成（モード選択、フィールド生成）
- `UIPhase`: ルール辞書ベースのフェーズ UI 制御クラス
- `UIStateUpdater` (instance: `UIState`): State 監視・動的コンテナレンダリング・空データクリーンアップ

### Method.html
- `DataUtils`: 配列再レイアウト、セレクタ検証、統計データ整形
- `FileValidator`: ファイルリスト検証・エラー判定
- `DataExtractor`: 抽出データ突合・フォーマット加工
- `PxrfValidator`: 重複データ判定・マージ
- `DataManager`: PXRF/WDXRF データ読込・結合・フィルタリング
- `PreviewManager`: プレビュー用データ構築・計算
- `CalcProcessor`: 単回帰分析・相関計算 (`simple-statistics` 依存)

### Controller.html
- `CoreCtrl`: 非同期排他制御（Async Lock）ラッパー
- `Tab1Ctrl`: Tab1 ユースケース実行（ファイル読込、検証、抽出、格納）
- `Tab2Ctrl`: Tab2 ユースケース実行（データ読込、確定、シンボル適用、プレビュー作成、レポート開く）

### Event.html
- `Evt`: イベント委譲ルーター、高階関数バインダ (`#bindMulti`, `#bindAll`)、リアクティブバリデーション
