# SAVEPOINT: OBPLOT1.0

## 🎯 Target: Both (Thinker & Coder) - 共通の事実ベース

### 1. ディレクトリ構造とファイル一覧（モジュール責務）
- **[A:Coreモジュール]** (汎用基盤):
  - `Code.js`: [API] バックエンドAPI (GAS通信, I/O, サイドバー起動)
  - `Adapter.html`: [Infra] API/Storageのアダプター・環境DI
  - `CoreState.html`: [State] グローバル設定 (`GLB`) および 状態管理 (`State`)
  - `CoreAction.html`: [Controller] システム基盤（ルーター、アクションパイプライン、初期化DIリゾルバ）
  - `CoreUI.html`: [View Engine] スキーマに基づくPatch型差分同期エンジン・汎用パーサー
  - `CoreMethod.html`: [Logic] 汎用ユーティリティ（計算・配列操作）
  - `Component.html`: [Component] 純粋HTML文字列ジェネレーター (`Tpl`)
  - `Chart.html`: [Component] グラフ描画 (`<ui-plot>` / ECharts保護用 Web Component維持)
  - `CSS.html`: [Style] 共通スタイルシート
- **[B:Tab1/Tab2 特化モジュール]**: 
  - `Tracer5i.html` (UI層), `Tracer5i_App.html` (Schema/Method/Action統合ロジック)
- **[C:Tab3/Report 特化モジュール]**: 
  - `Dash.html` (UI層), `Dash_App.html` (Schema/Action統合ロジック)
  - `Report.html` (UI層), `Report_Logic.html` (Schema/Method統合ロジック), `Report_APP.html` (Action/Initコントローラー)

### 2. フェーズ・ステートマシン（状態遷移定義）
- **Tab 1 (データ抽出)**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
- **Tab 2 (グラフ作成)**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5) -> STANDARDIZED(6)`
- **Tab 3 (ダッシュボード)**: `INIT(1) -> LOADED(2)`

---

## 🧠 Target: Thinker - 設計・アーキテクチャ情報

### 3. システム・アーキテクチャ詳細 (State-Driven & Schema-Driven)
- **単方向データフロー**: `Action (ビジネスロジック) -> State (状態更新) -> CoreUI (DOM自動反映)` の一方通行フローを徹底する。
- **Stateless Patcher パラダイム**: UIコンポーネントは `Component.html` の純粋HTML文字列カタログ (`Tpl`) を用いて静的に生成し、DOMへの動的な値の反映（パッチ処理）はすべて `CoreUI` に集約する。
  - **Why**: ブラウザネイティブの `connectedCallback` 等のDOMライフサイクルと、内部 State 同期のタイミングのズレによって生じる状態不整合（空振り）を構造的に排除するため。
  - **例外（UIPlotの保護）**: EChartsのような「Canvas状態」と「ResizeObserver等による破棄ライフサイクル」の厳密な管理を要求する命令的サードパーティライブラリに対してのみ、Web Components方式（`<ui-plot>`）を利用する。
- **プレゼンテーションとフラットHydration**: 各画面専用の `SCHEMA` オブジェクトにフェーズ制約やプロパティバインディングを宣言しUIを駆動する。同時に、`SCHEMA` 内の `persistPaths` (永続化対象パス定義) と `CoreMakeBU` を組み合わせ、複雑にネストした `State` をフラットなJSONとしてStorageへ保存・動的復元する設計とする。
  - **Why**: 画面リロードやタブ切り替え時における初期化フローをスリム化し、状態の完全な復元を低コストかつ強固に実現するため。
- **イベントデリゲーション (`rootGLB`)**: UIからの発火イベント（`click`, `change`, `input`）はすべて `rootGLB` が単一のリスナーで捕捉し、`data-action` や `data-change` 属性に従って該当するActionクラスへ自動ルーティングする。
  - **Why**: 散在する `addEventListener` を撲滅し、DOMとビジネスロジックの結合度を下げるため。
- **汎用コアの完全抽象化 (DI)**: A:Coreモジュール群は特定の画面に依存しない独立した基盤ライブラリとして振る舞う。各画面モジュール（B・C）は、`CoreAction` の `cfgRslv` (DIリゾルバ) を通じて自身のスキーマや固有設定を注入し、Coreを駆動させる。
  - **Why**: プラットフォーム（Excel連携等）や新規画面の追加に対して、Coreのコードを一切変更せずに対応可能な拡張性を保つため。
- **グラフレポートの独立**: グラフレポート機能 (`ReportApp.html`) は、本体アプリケーションから完全に独立した単一のHTML (SPA) として実装する。親画面とはStorageやURLパラメータを介して状態を共有する。
  - **Why**: Excel版での独立動作保証や、外部ライブラリを介さずブラウザネイティブの機能で美しいPDF変換（印刷機能）を担保するため。

### 4. マルチ環境実装原理（excellECS.md）
- `PlatformAdapter.html` によるAPI (通信) と Storage (永続化) の環境ごとの動的切り替え。
- `infra/build.js` による自動ビルド機構（Excel環境のCSP制限回避と純粋な静的HTMLの生成）。

### 5. コア・コントラクト（処理フロー上の規約）
- **ドメインロジック分離**: ドメイン固有処理は `Tracer5i_Method` 等へ、汎用計算は `CoreMethod` へ分離する。入力から出力を返す純粋関数として実装し、外部状態・DOMに依存させない。
- **高階関数によるボイラープレート撲滅**:
  - `CoreUI` における `State.subscribe` と初期値注入の定型処理は `makeBinder` 高階関数でラップする。
  - `CoreAction` における通信や非同期処理は `ensureFetch` や `withAsync` を必ず経由する。
  - **Why**: 各アクションやUIバインダーから冗長なエラーハンドリング・購読処理を排除し、純粋なビジネスロジックの記述に集中させるため。

### 6. コア・デザイン原則：CSSクラスとJSの責務分離
1. **CSSクラスの純粋性**: CSSクラスは「UIの静的な装飾」および「状態による視覚的変化」のみを純粋に司る。
2. **JSからのCSSクラス検知の禁止**: DOMの特定や状態検知は必ず `data-*` 属性を介して行い、CSSクラスを処理の判定基準としない。
3. **スタイル定義のデフォルト化**: 動的に見た目を変更する場合は `data-opts` などのオプション属性にHTML上で宣言し、JSがそれを解釈して動的に付与する。
4. **data-属性乱立禁止**: data-属性は以下の分類ルール**絶対のルール**として、パーサー・ルーターの活用による新たな属性の乱立を徹底的に防止する。

### 7. data-属性の分類ルール (The 6 Pillars)
*   **【1】操作・識別系**
    *   `data-action`: イベント発火先メソッド（`"NS.method"`）。
    *   `data-param`: Action引数 兼 要素識別値。複数値は `|` 区切りで吸収。
*   **【2】UI構築・状態結合系**
    *   `data-ui`: UI種別。ウィジェットタイプを宣言（`dlg`, `mselect`, `addon`, `form` 等）。
    *   `data-out`: State→DOM リアクティブ購読宣言（`bind: path; opts: path` 等、旧 `data-patch`）。
    *   `data-opts`: 汎用オプション。巨大パーサーがカテゴリ分岐（JSON / kv 対応）。
*   **【3】DOM識別系**
    *   `data-part`: DOM識別用。JSからの純粋なクエリ用マーカー 兼 スキーマターゲット。
*   **【CSS内部専用（開発者記述禁止）】**
    *   `data-view`: 視覚状態トークン。`data-opts="view: ..."` 経由でパーサーが書き込み、CSSがこれを参照する。

### 8. 汎用パーサー・ルーター戦略 (CoreUIPatcher)
- **applyOpts (巨大パーサー)**: `data-opts` を JSON / kv 対応でパースし、「ui-opts（アドオンやフォーム初期化）」「view-state（`data-view`への書き込み）」「free（自由拡張）」へ振り分ける。
- **routOut (旧 routPatch)**: 初期化時のみ属性をパースし、更新関数をクロージャとして登録。State変更時は直接実行し高効率な差分同期を実現。
- **routEvent**: イベントの `e.type` と要素タグを評価し、click/change/input等の発火を自動判定・ルーティングする。
- **routBuilder**: `data-ui` 属性を持つ要素の初期構築（`initDlg`, `applyOpts`呼び出し等）を担い、二重初期化の破綻を完全に防ぐ。

### 9. 開発状況と次ステップ
- LLM開発の最適化（1ファイル300〜800行のスイートスポット化）を目指し、UIとロジック（App/Logic）の分離アーキテクチャによるファイル統廃合を完了。
- **次のステップ**:
- JSが動的構築するUIを含めたCSSの複雑な依存関係の調査とCSSカスタマイズ容易化アプローチの検討


---
