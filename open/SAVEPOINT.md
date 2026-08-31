# SAVEPOINT.md: OBPLOT1.0

## 1. システム・アーキテクチャ（設計思想とパラダイム）
- **実行環境**: Google Apps Script (V8 runtime) / HTML Service (Sidebar & Blob URL)
- **コア・パラダイム**: SPA型 MVMS (Model-View-Method-Service) + Web Components + Presenter パターン
- **状態管理 (Single Source of Truth)**: 
  - `AppState` による厳格なObserver (Pub/Sub) モデル。状態はセクションごとに階層化。軽量な refs と phase のバックアップと再起動時検証。
  - **[Why]**: DOMを状態の正とせず、Stateの変更のみがUIを駆動する（単方向データフロー）ことで、予測不可能な副作用を排除する。
  - **[How]**: 状態取得時の冗長性を排除するため、`const { prev } = State.proxy.Tab2ST;` のように Proxy 経由の分割代入を利用する。各セクションの初期状態はファクトリ関数によって生成し、階層スキーマを厳格に保証する。
- **プレゼンテーション (Declarative UI & Auto DI & Schema-Driven)**: 
  - **[Why]**: UI構造とビジネスロジック、およびイベント発火の責務を完全に分離し、HTML側のスケルトン化（ID属性の廃止）を極めるため。DOM操作による状態のバイパス（Hack）を根絶し、手動バインディングによる保守性のボトルネックを解消する。
  - **[How]**: `<ob-popover>` 等の Web Components で振る舞いを隠蔽。HTML要素に対して、イベント発火の目印となる `data-action` と、UI状態制御の目印となる `data-ui` を明確に分けて付与する。起動時にこれらの属性を走査し、セクション起点の相対参照と自動購読（Auto Subscribe）によるDIを完全自動化する。
  - **[How(Report)]**: 独立した出力画面（Report層）においては、`UI_SCHEMA`（設定配列）と `UIAutomator` を導入。UIの生成・値の監視・Stateの同期をスキーマ駆動で全自動化し、泥臭いDOM操作を完全に排除した。
- **グラフレンダリングと精密レイアウト制御**:
  - **[Why]**: EChartsの動的描画において、ユーザー設定の余白（絶対値）とウィンドウサイズ（相対値）の衝突による「ラベルの見切れ」や「二重パディング」を防ぎ、WYSIWYG（見たまま印刷）を保証するため。
  - **[How]**: `Chart.html` が文字サイズに基づき自律的に「安全マージン」を計算し、ユーザー設定余白が不足する場合のみ自動補填する。親コンテナ（Report層）は `Chart.html` と全く同じ計算式をシミュレートし、CSS Grid (`place-items: center`) と連携してミリ単位の中央配置を実現する。
- **配布・連携モデル (GASライブラリ化 ＆ テンプレート配布)**:
  - **[Why]**: エンドユーザーのUXを最大限簡易化し、開発者はライブラリ側の更新のみで全環境へ最新ロジックを一括配信するため。
  - **[How]**: 本体をGASライブラリとして非公開デプロイし、配布用テンプレートシートには最低限のラッパー関数（onOpen, showSidebar およびAPI中継）のみを配置。
- **拡張性 (Add-in Portability)**:
  - **[Why]**: GAS環境とOffice Web Add-in（Excel）環境の双方で、同一コードによる完全共有と単一管理を実現するため。
  - **[How]**: GitHub Actions（`infra/build.js`）による自動ビルドで単一の静的HTMLを生成し、環境依存の通信・永続化処理はAdapterを用いて動的に切り替える。

## 2. マルチ環境実装原理
- **環境差異の吸収**: `typeof Office !== 'undefined'` 等による環境検知を用い、API (通信) と Storage (永続化) を環境ごとにAdapterで切り替える。
- **自動ビルド・デプロイ機構 (infra連携)**:
  - `infra/build.js` を用いたGitHub Actionsにより、`src/` 配下のソース群を1枚の静的HTML（`App.html`等）に結合し、Pagesへデプロイする。
  - **[Why]**: Excel環境特有のCSP（セキュリティポリシー）制限やXSSリスクを排除し、エンドユーザーへ安全かつ単一のファイルとして提供するため。
- **ビルド時のパーサー制約回避**:
  - **[Why]**: テンプレートHTMLをJSの文字列として埋め込む際、ブラウザのHTMLパーサーが `</script>` を検知してスクリプトを強制分断・クラッシュさせるのを防ぐため。
  - **[How]**: ビルドスクリプトおよびコード内で `'<' + '/script>'` のように文字列分割・エスケープを徹底する。
- **アドイン特有のサンドボックス・キャッシュ対策**:
  - **[Why]**: Web版Excelの iframe 制約によるネイティブダイアログ（`showModal`）の遮断や、強烈なローカルキャッシュによる更新反映漏れを防ぐため。
  - **[How]**: ダイアログエラー時はCSSによる強制表示フォールバックを実行し、マニフェストの参照URLには `&v=2` 等のバージョンクエリを付加してキャッシュを強制破棄させる。

## 3. コア・コントラクト（絶対的制約とコーディング規約）
機能追加やリファクタリング時は、以下の思想と制約を**必ず**遵守すること。

1. **ビジネスロジックの純粋化 (Method層への一元化)**:
   - **[Why]**: テスト容易性と保守性の担保。処理の重複（DRY原則違反）を防ぐため。
   - **[Rule]**: DOM APIやGAS通信 (`API.fetchData`等) を一切混入させない純粋関数として実装する。
   - **[Rule]**: Controller層（サイドバー）やReport層（印刷プレビュー）で行うデータ生成・回帰計算ロジックは、必ず `Method.html` (`Mtd`) 内の共通関数（`generateChartData` 等）に集約し、各層からはそれを呼び出すのみとする。
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

## 4. アーキテクチャ・パイプライン（データフロー）
- **[コマンド (非同期実行等)]**: `User Action (data-action) -> Evt Router -> Controller <-> API/Method -> State.set -> View Engine (data-ui) -> Web Components`
- **[リアクティブ (入力選択等)]**: `User Input -> Evt Router -> State.set -> View Engine (data-ui) -> Web Components`
- **[Report層 (スキーマ駆動)]**: `User Action/Input (data-action/data-bind) -> UIAutomator -> State.set -> Method -> Chart.html`

## 5. フェーズ・ステートマシン（状態遷移定義）
- **Tab 1 (データ抽出)**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
- **Tab 2 (グラフ作成)**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5)`
- **[Why]**: フェーズ遷移に伴うUIの表示/非活性制御を命令的な `if` 分岐で行わず、`UIPhase` の定数マップに基づく宣言的ルールエンジンに集約するため。
- **[How]**: UIルールの定義をフラットな羅列から「セクション空間」ごとのネスト構造に整理し、親セクションと `data-ui` 属性を組み合わせた相対DOM参照エンジンによって、HTML要素の特定と状態適用を完全自動化する。

## 6. ディレクトリ構造と関数一覧（モジュール責務）
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
- `Report.html`: [Template] レポート出力用静的HTML（骨格）
- `ReportCSS.html`: [Style] レポート出力専用のスタイル定義
- `ReportLogic.html`: [Controller/View] スキーマ駆動型UI自動生成・状態管理・印刷フロー制御

## 7. 開発状況と次ステップ
- **現在の状況**: `Report.html` の実装完了
- 配布用GASおよびExcell版の動作確認
