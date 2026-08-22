for gemini
### セーブポイント：OBPLOT1.0

## 1. システム・アーキテクチャ（設計思想とパラダイム）
- **実行環境**: Google Apps Script (V8 runtime) / HTML Service (Sidebar & Blob URL)
- **コア・パラダイム**: SPA型 MVMS (Model-View-Method-Service) + Web Components + Presenter パターン
- **状態管理 (State Management - Single Source of Truth)**: 
  - `AppState` による Observer (Pub/Sub) モデルを採用。状態はセクション (`dataset`, `symbol`, `preview`, `report`) ごとに厳密に階層化される。
  - 状態の後退・破棄は、各階層の初期値を安全に復元する `reset()` メソッドによってフェイルセーフに管理される。
  - Controller等での冗長なState取得を簡略化するため、オブジェクト分割代入を利用できる proxy を経由。
- **プレゼンテーション (UI & Rendering Philosophy)**: 
  - **UIプリミティブのカプセル化 (Web Components)**: `<ob-popover>`, `<ob-multi-select>`, `<ob-symbol-table>`, `<ob-cal-plot>` 等のカスタム要素を用い、Popover APIのバインディングやAnchor位置計算などの「振る舞い」と「内部構造」を完全に隠蔽する。
  - **完全宣言的UI (Declarative Builder)**: 設定配列 (Config Array) を受け取るファクトリ (`NewDOM.buildFormFields`) がDOMを動的構築し、静的マークアップと動的生成の境界を明確化。
  - **ViewとLogicの分離 (Presenter パターン)**: 全てのHTML文字列生成を `Tpl` クラス（疑似テンプレート管理）へ集約。タグ付きテンプレートリテラル (`html``)で未定義値のフォールバックを隠蔽して宣言。名前空間（Common, Stats, Symbol等）で純粋関数として管理し、DRY原則を徹底。
  - **デザイントークンとレイヤーアーキテクチャ**: CSS Nesting構文と変数設計に加え、最新の カスケードレイヤー (@layer reset, base, components, utilities) で詳細度の競合をアーキテクチャレベルで排除し堅牢性を確保。
  - **UIフェーズ制御 (Phase UIControl)**: 定数マップに基づく宣言的UIルールエンジン (`UIPhase`) で集約制御。
- **データフローと厳格なDI (Unidirectional Data Flow & Reactive DI)**:
  - ユーザー操作 -> `data-action`/`data-change` -> `Event` (ルーター) -> Controller (フロー制御) -> State (更新) -> View (購読) -> Web Components (DIによるプロパティ注入) -> 内部再描画、という厳格な単方向サイクルを遵守する。
  - **【重要】直接的なDOM操作やプロパティ代入による「状態のバイパス（Hack）」は、初期化処理であっても許容しない。UIの初期状態も必ず `State.set` による状態発火を通じてコンポーネントに注入（DI）されなければならない。**
- **将来的な拡張性 (Add-in Portability)**:
  - 非同期通信のためのGAS通信層 (`GasService`) 以外は、標準Web技術 (ES6, Web Components, CSS Nesting) に完全準拠し、将来的な「Office Add-in + GitHub Pages」等のローカル配布環境への移植を前提とした設計とする。

---

## 2. ディレクトリ構造とモジュール責務
- `Code.js`: [Service] バックエンドAPI (データI/O, UserProperties管理, HTML供給)
- `Sidebar.html`: [UI] メインUIの静的構造定義。動的要素はWeb Componentタグの配置のみ。
- `CSS.html`: [Style] トークン定義、共通ユーティリティ、カプセル化されたコンポーネントスタイル。
- `Model.html`: [Model] 状態管理ストア(`AppState`), 定数群(`GLOBAL_CONFIG`), API通信ラッパー(`GasService`)。
- `Component.html`: [Component/Presenter] DOM構築ビルダー(`NewDOM`), テンプレート管理(`Tpl`), カスタム要素定義群。
- `View.html`: [View] 宣言的UIルールエンジン(`UIPhase`), 状態購読とコンポーネントへのデータ注入(DI)を担うバインディング層(`UIStateUpdater`)。
- `Chart.html`: [Component] EChartsをカプセル化したグラフ描画用カスタム要素 (`<ob-cal-plot>`) とテーマキャッシュ。
- `Method.html`: [Logic] DOM/APIに一切依存しない、純粋関数によるビジネスロジック群 (データ加工, 統計計算, バリデーション)。
- `Controller.html`: [Controller] ユースケース単位の非同期フロー制御、Stateのリセット・更新のオーケストレーション。
- `Event.html`: [Event] 静的属性に基づくイベント委譲ルーター、リアクティブな入力バリデーションフック。
- `Report.html`: [Template] レポート出力用静的HTMLテンプレート (Blob URL 別タブ展開用)。

---

## 3. コア・コントラクト（絶対的制約事項）
1. **[State Store]** 状態の更新は必ず `.set()` を経由し、状態の初期化は `.reset()` で明示的に行う。DOMからの逆算による状態取得は禁止。
2. **[UI Rules]** フェーズ遷移に伴うUIの活性/非活性・表示制御は、命令的な `if` 分岐を避け、`UIPhase` の定数マップ定義（宣言的ルール）に集約する。
3. **[UI Renderer]** `View` 層（`UIStateUpdater`）はDOMを直接操作しない。Stateを購読し、ヘルパー関数やWeb Componentに対してデータ (DTO) をプロパティとして注入 (DI) する「パイプライン」に徹する。可能な限りHTMLの宣言的バインディング属性 (`data-bind-*`) を活用し、手動のDOMプロパティ代入を避ける。**※初期表示を操作するためのView側からの直接プロパティ代入は、リアクティブサイクルを破壊するため厳禁とする。**
4. **[Business Logic]** `Method` 層は副作用を持たない純粋関数・クラス群として実装し、DOM操作やAPI通信を一切混入させない。
5. **[Event Router]** `Event` 層は複雑なロジックを持たず、高階関数や属性ルーティングを用いてイベントを捕捉し、速やかに `Controller` または `State.set()` へ処理を委譲する。
6. **[API Communication]** GASとの通信は `GasService` (Promiseラッパー) を用い、`async/await` と `try/catch` によるエラーハンドリングを徹底する。

---

## 4. アーキテクチャ・パイプライン（イベントとデータの経路）
- **[コマンド・ルート (非同期実行・ボタン操作等)]**:
  `[User Action] -> (data-action) -> [Evt Router] -> [Controller] <-> (Method / API) -> (Mutate) -> [AppState] -> (Subscribe) -> [View (UIPhase/UIStateUpdater)] -> (DI) -> [Web Components]`
- **[リアクティブ・ルート (同期実行・入力選択等)]**:
  `[User Input] -> (data-bind / data-change) -> [Evt Router] -> (Mutate) -> [AppState] -> (Subscribe) -> [View (UIPhase/UIStateUpdater)] -> (DI) -> [Web Components]`

## 5. フェーズ・ステートマシン（状態遷移定義）
- **[Tab 1: データ抽出]**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
  - ※ `INVALID` フェーズ移行時、またはシート編集検知時、`State.reset(['Tab1ST.exac'])` により抽出Stateを初期化しダウングレードする。
- **[Tab 2: グラフ作成]**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5)`
  - ※ データロード(`LOADED`)時: 全Tab2関連Stateをリセット。
  - ※ データ確定(`FILTERED`)時: `State.reset(['Tab2ST.symbol', 'Tab2ST.preview', 'Tab2ST.report'])` により後続Stateを初期化。

## 6. 次の開発手順
- 新規開発は停止し、設計思想と現在の動作・UI挙動を維持したままコードのスリム化と保守性向上のリファクタリングを行う。
- 空行改行の削除と長すぎる処理にコーディングルールに基づく処理説明的コメントアウトを追加
- Method.htmlの高階層化。PreviewManagerを手本として保守性の向上と省コード化に努める。
