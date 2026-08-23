# SAVEPOINT.md: OBPLOT1.0

## 1. システム・アーキテクチャ（設計思想とパラダイム）
- **実行環境**: Google Apps Script (V8 runtime) / HTML Service (Sidebar & Blob URL)
- **コア・パラダイム**: SPA型 MVMS (Model-View-Method-Service) + Web Components + Presenter パターン
- **状態管理 (Single Source of Truth)**: 
  - `AppState` による厳格なObserver (Pub/Sub) モデル。状態はセクションごとに階層化。
  - **[Why]**: DOMを状態の正とせず、Stateの変更のみがUIを駆動する（単方向データフロー）ことで、予測不可能な副作用を排除する。
  - **[How]**: 状態取得時の冗長性を排除するため、`const { preview } = State.proxy.Tab2ST;` のように Proxy 経由の分割代入を利用する。
- **プレゼンテーション (Declarative UI & DI)**: 
  - **[Why]**: UI構造とビジネスロジックを分離し、DOM操作による状態のバイパス（Hack）を根絶するため。
  - **[How]**: `<ob-popover>` 等の Web Components で振る舞いを隠蔽。HTML生成は `Tpl` クラス（タグ付きテンプレートリテラル）に集約し、View層はStateを購読してコンポーネントにデータを注入(DI)するパイプラインに徹する。
- - **将来的な拡張性 (Add-in Portability)**:
  - **[Why]**: 将来的に「Office Add-in + GitHub Pages」等のローカル配布環境への移植を前提とするため
  - **[How]**: 非同期通信のためのGAS通信層 (`GasService`) 以外は、標準Web技術 (ES6, Web Components, CSS Nesting) に完全準拠する

## 2. コア・コントラクト（絶対的制約とコーディング規約）
機能追加やリファクタリング時は、以下の思想と制約を**必ず**遵守すること。

1. **ビジネスロジックの純粋化 (Method層)**:
   - **[Why]**: テスト容易性と保守性の担保。
   - **[Rule]**: DOM APIやGAS通信 (`API.fetchData`等) を一切混入させない純粋関数として実装する。
2. **ステートレス化とイミュータブル処理**:
   - **[Why]**: 外部変数のミュータブルな書き換え（副作用）によるバグを防ぐため。
   - **[Rule]**: `for...of` 等のループ内での状態更新を避け、`reduce` と `Map` を用いた集計や、高階関数を用いたパイプライン処理に置き換える。
3. **モダン構文によるコード削減 (過剰DRYの回避)**:
   - **[Why]**: 可読性を保ちつつ、冗長な代入やガード節を極小化するため。
   - **[Rule]**: オプショナルチェイニング (`?.`) と Null合体演算子 (`??`) で安全なフォールバックを1行で完結させる。
   - **[Rule]**: 動的プロパティ生成は手動代入を避け、`...Object.fromEntries(arr.map(...))` を活用する。
4. **厳格なコメント・フォーマット規約**:
   - **[Rule]**: 関数ブロックの先頭には必ず `// --- 機能名 ---` を付与。
   - **[Rule]**: 処理内のコメントは、処理の意図（Why）を「15文字以内」で記述。
   - **[Rule]**: クラスやメソッド間、ブロック間の**空行（ブランク行）は完全に削除**し、情報密度を最大化する。

## 3. アーキテクチャ・パイプライン（データフロー）
- **[コマンド (非同期実行等)]**: `User Action -> Evt Router -> Controller <-> API/Method -> State.set -> View (DI) -> Web Components`
- **[リアクティブ (入力選択等)]**: `User Input -> Evt Router -> State.set -> View (DI) -> Web Components`

## 4. フェーズ・ステートマシン（状態遷移定義）
- **Tab 1 (データ抽出)**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
- **Tab 2 (グラフ作成)**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5)`
- **[Why]**: フェーズ遷移に伴うUIの表示/非活性制御を命令的な `if` 分岐で行わず、`UIPhase` の定数マップに基づく宣言的ルールエンジンに集約するため。

## 5. ディレクトリ構造と関数一覧（モジュール責務）
- `Code.js`: [Service] バックエンドAPI (GAS通信, I/O)
- `Sidebar.html`: [UI] 静的ベース構造
- `CSS.html`: [Style] トークン定義, カスケードレイヤー (`reset`, `base`, `components`, `utilities`)
- `Model.html`: [Model] 状態管理 (`AppState`), 定数 (`GLOBAL_CONFIG`), APIラッパー (`GasService`)
- `Method.html`: [Logic] 純粋関数群 (`DataUtils`, `FileValidator`, `DataExtractor`, `DataManager`, `PreviewManager`, `CalcProcessor`)
- `Component.html`: [Component] DOMビルダー (`NewDOM`), Web Components群, テンプレート (`Tpl`)
- `View.html`: [View] UIルールエンジン (`UIPhase`), DIバインディング (`UIStateUpdater`)
- `Controller.html`: [Controller] 非同期フロー制御 (`Tab1Ctrl`, `Tab2Ctrl`, `CoreCtrl`)
- `Event.html`: [Event] イベント委譲ルーター (`Evt`)
- `Chart.html`: [Component] グラフ描画 (`<ob-cal-plot>`)
- `Report.html`: [Template] レポート出力用静的HTML

## 6. 開発状況と次ステップ
- **現状**: Method, Component, View, Event, Controller 全層に対し、パターンC（スマート・バランス型）に基づくモダン化・スリム化のリファクタリングを完了。
- **次ステップ**: 別途指示
