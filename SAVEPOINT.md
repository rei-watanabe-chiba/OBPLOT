# SAVEPOINT.md: OBPLOT1.0

## 1. システム・アーキテクチャ（設計思想とパラダイム）
- **実行環境**: Google Apps Script (V8 runtime) / HTML Service (Sidebar & Blob URL)
- **コア・パラダイム**: SPA型 MVMS (Model-View-Method-Service) + Web Components + Presenter パターン
- **状態管理 (Single Source of Truth)**: 
  - `AppState` による厳格なObserver (Pub/Sub) モデル。状態はセクションごとに階層化。軽量な refs と phase のバックアップと再起動時検証。
  - **[Why]**: DOMを状態の正とせず、Stateの変更のみがUIを駆動する（単方向データフロー）ことで、予測不可能な副作用を排除する。
  - **[How]**: 状態取得時の冗長性を排除するため、`const { prev } = State.proxy.Tab2ST;` のように Proxy 経由の分割代入を利用する。各セクションの初期状態はファクトリ関数によって生成し、階層スキーマを厳格に保証する。
- **プレゼンテーション (Declarative UI & Auto DI)**: 
  - **[Why]**: UI構造とビジネスロジック、およびイベント発火の責務を完全に分離し、HTML側のスケルトン化（ID属性の廃止）を極めるため。DOM操作による状態のバイパス（Hack）を根絶し、手動バインディングによる保守性のボトルネックを解消する。
  - **[How]**: `<ob-popover>` 等の Web Components で振る舞いを隠蔽。HTML要素に対して、イベント発火の目印となる `data-action` と、UI状態制御の目印となる `data-ui` を明確に分けて付与する。起動時にこれらの属性を走査し、セクション起点の相対参照と自動購読（Auto Subscribe）によるDIを完全自動化する。
- **将来的な拡張性 (Add-in Portability)**:
  - **[Why]**: 将来的に「Office Add-in + GitHub」等のローカル配布環境への移植を前提とするため。
  - **[How]**: 非同期通信のためのGAS通信層 (`GasService`) 以外は、標準Web技術 (ES6, Web Components, CSS Nesting) に完全準拠する。

## 2. コア・コントラクト（絶対的制約とコーディング規約）
機能追加やリファクタリング時は、以下の思想と制約を**必ず**遵守すること。

1. **ビジネスロジックの純粋化 (Method層)**:
   - **[Why]**: テスト容易性と保守性の担保。
   - **[Rule]**: DOM APIやGAS通信 (`API.fetchData`等) を一切混入させない純粋関数として実装する。
   - **[Rule]**: 列インデックス等のマジックナンバーは排除し、ヘッダー配列からの動的走査（`indexOf`等）によるバインドを徹底する。
2. **ステートレス化とイミュータブル処理**:
   - **[Why]**: 外部変数のミュータブルな書き換え（副作用）によるバグを防ぐため。
   - **[Rule]**: `for...of` 等のループ内での状態更新を避け、`reduce` と `Map` を用いた集計や、高階関数を用いたパイプライン処理に統合する。
3. **モダン構文によるコード削減 (過剰DRYの回避)**:
   - **[Why]**: 可読性を保ちつつ、冗長な代入やガード節を極小化するため。
   - **[Rule]**: オプショナルチェイニング (`?.`) と Null合体演算子 (`??`) で安全なフォールバックを1行で完結させる。
   - **[Rule]**: 動的プロパティ生成は手動代入を避け、`...Object.fromEntries()` を活用し、宣言的に記述する。
4. **命名規則の厳守とStateスキーマの画一化**:
   - **[Why]**: `HTMLElement.dataset` 等のDOM標準プロパティとの衝突によるサイレントバグを完全に回避し、同時にState構造の差異によるバグを防ぎ他層からの推測可能性を高めるため。
   - **[Rule]**: 各セクションのStateは `{ status, data, refs, flags }` の共通階層構造（スキーマ）に強制統一する。
   - **[Rule]**: 汎用プロパティ（`map`, `set`, `get`, `value`）や衝突リスクのある名称（`dataset`）は禁止し、高度な短縮形（`raw`, `extr`, `prev`, `symb`, `calb`等）でシステム全体を統一する。※ただし、ドメイン固有の重要キー（資料IDとしての `id`, `ID` 等）とstate操作におけるget, setは例外とする。
5. **厳格なコメント・フォーマット規約**:
   - **[Rule]**: 関数ブロックの先頭には必ず `// --- 機能名 ---` を付与。
   - **[Rule]**: 処理内のコメントは、処理の意図（Why）を「15文字以内」で記述。
   - **[Rule]**: クラスやメソッド間、ブロック間の**空行（ブランク行）は完全に削除**し、情報密度を最大化する。

## 3. アーキテクチャ・パイプライン（データフロー）
- **[コマンド (非同期実行等)]**: `User Action (data-action) -> Evt Router -> Controller <-> API/Method -> State.set -> View Engine (data-ui) -> Web Components`
- **[リアクティブ (入力選択等)]**: `User Input -> Evt Router -> State.set -> View Engine (data-ui) -> Web Components`

## 4. フェーズ・ステートマシン（状態遷移定義）
- **Tab 1 (データ抽出)**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
- **Tab 2 (グラフ作成)**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5)`
- **[Why]**: フェーズ遷移に伴うUIの表示/非活性制御を命令的な `if` 分岐で行わず、`UIPhase` の定数マップに基づく宣言的ルールエンジンに集約するため。
- **[How]**: UIルールの定義をフラットな羅列から「セクション空間」ごとのネスト構造に整理し、親セクションと `data-ui` 属性を組み合わせた相対DOM参照エンジンによって、HTML要素の特定と状態適用を完全自動化する。

## 5. ディレクトリ構造と関数一覧（モジュール責務）
- `Code.js`: [API] バックエンドAPI (GAS通信, I/O)
- `Sidebar.html`: [UI] 静的ベース構造 (Auto DI属性とイベントルーター属性の保持)
- `CSS.html`: [Style] トークン定義, カスケードレイヤー (`reset`, `base`, `components`, `utilities`)
- `Model.html`: [Model] 状態管理 (`AppState`), 定数 (`GLB.Conf`), APIラッパー (`API`)
- `Method.html`: [Logic] 純粋関数群 (`Mtd.Util`, `Mtd.T1`, `Mtd.T2`)
- `Component.html`: [Component] DOMビルダー (`NewDOM`), Web Components, テンプレート (`Tpl`)
- `View.html`: [View] UIルールエンジン (`UI.Phs`), DIバインディングエンジン (`UI.StateUpd`)
- `Controller.html`: [Controller] 非同期フロー制御 (`CoreCtrl`, `T1Ctrl`, `T2Ctrl`)
- `Event.html`: [Event] イベント委譲ルーター (`Evt`), アイドル検知 (`IdlTm`), バックアップ管理 (`MakeBU`)
- `Chart.html`: [Component] グラフ描画 (`<ob-cal-plot>`)
- `Report.html`: [Template] レポート出力用静的HTML

## 6. 開発状況と次ステップ
- 将来的な拡張性 (Add-in Portability)にむけた動作確認環境の構築
### 1. 想定環境
- 本アプリをOffice Add-inとGitHubを活用してExcelに実行環境をセットアップし、サイドバー上で静的HTMLとして動作させます。
- GitHub上のコードはエンドユーザへのGAS配布を前提としてエクセルのセットアップでも共有します。
- GASコード部分は一切変更せず（もしくはガードを組み込んで）、GASでincludeしないエクセルサイド専モックアダプターとHTMLによりフロントエンドロジックの完全共有を目指します。

### 1. エクセルサイド専モックアダプターの構築
* **Why**: GASとローカルExcel環境を両立させ、開発・保守の利便性を最大化するため。
* **How**: GitHubでソースコードを一元管理し、ローカル環境から静的HTMLとして参照させる。
* **Do**: GitHubから最新リポジトリをクローンまたは取得し、マニフェストを設定してエクセルへサイドロードする。

### 2. ディレクトリ構成
* **Why**: 本番用GASコードへの影響や汚染を一切排除し、プラットフォーム間の差分を安全に分離するため。
* **How**: 共通のコアロジックを活かしつつ、エクセル専用のエントリポイントとモック層を別ファイルとして独立配置する。
* **Do**: `Sidebar_Excel.html` と `PlatformAdapter.html` を新規追加し、既存のGAS用ファイル群と明確に切り離す。

### 3. GAS側およびエクセル・Add-in側の挙動
* **Why**: 固有の通信機構やテンプレート処理（`include`等）の差異による競合やエラーを回避するため。
* **How**: GASでは既存コードのまま `HtmlService` とサーバー通信を行い、エクセルでは静的HTMLとモックストレージで代替する。
* **Do**: GAS環境では本番API、エクセル環境では `PlatformAdapter` によるデータ入出力・プロパティ保存・編集検知の代用を適用する。

### 4. 今回行うこと
* **Why**: 実装コストと将来的な拡張性のバランスを正確に検証し、実運用における確実性を担保するため。
* **How**: 上記設計の実装可能性と機能代替の必要性を検証する
* **Do**: 公式ドキュメントや関連情報を集中し、1~3の実現可能性を検討。なおlocalStorageの利用については、既存Eventコードにガードを設置し、エクセルでは機能代替を呼び出すように改修することは許可する。これ以外のコード全体の処理を精査しGAS依存の処理の代替が必要な箇所がないかについても追加検討する。
