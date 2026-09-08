# SAVEPOINT: OBPLOT1.0

## 🎯 Target: Both (Thinker & Coder) - 共通の事実ベース

### 1. ディレクトリ構造とファイル一覧（モジュール責務）
- **[A:Coreモジュール]** (汎用基盤):
  - `Code.js`: [API] バックエンドAPI (GAS通信, I/O, サイドバー起動)
  - `PlatformAdapter.html`: [Infra] API/Storageのアダプター・環境DI
  - `Global.html`: [Config] アプリケーション全体のグローバル設定・定数 (`GLB`)
  - `Model.html`: [Model] 状態管理 (`State`)
  - `CoreAction.html`: [Controller] システム基盤（ルーター、アクションパイプライン、初期化DIリゾルバ）
  - `CoreUI.html`: [View Engine] スキーマに基づくPatch型差分同期エンジン・汎用パーサー
  - `CoreMethod.html`: [Logic] 汎用ユーティリティ（計算・配列操作）
  - `Component.html`: [Component] 純粋HTML文字列ジェネレーター (`Tpl`)
  - `Chart.html`: [Component] グラフ描画 (`<ui-plot>` / ECharts保護用 Web Component維持)
  - `CSS.html`: [Style] 共通スタイルシート
- **[B:Tab1/Tab2 特化モジュール]**: `Tracer5i.html`, `Tracer5i_Schema.html`, `Tracer5i_Action.html`, `Tracer5i_Method.html`
- **[C:Tab3/Report 特化モジュール]**: `Dash.html`, `Dash_Schema.html`, `Dash_Action.html`, `Report.html`, `ReportCSS.html`, `Report_App.html`, `Report_Schema.html`,

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

### 7. data-属性の分類ルール (The 4 Pillars)
*   **【1】State操作・イベント発火系**
    *   `data-action`: 単発イベントの発火（click等）。
    *   `data-param`, `data-sub-param`: Actionに渡す引数（最大2つまで）。
*   **【2】UI変更・構築系**
    *   `data-ui`: HTML構造そのものを動的にマウントするトリガー（`dlg`, `mselect`, `addon` 等）。
    *   `data-patch`: Stateの値を元に動的な変更を加えるトリガー（`bind: ...; opts: ...`）。
    *   `data-opts`: 上記の構築・パッチ処理に必要な設定オプション（1属性に集約）。
*   **【3】DOM参照・識別系**
    *   `data-part`: 要素特定・クエリ用の純粋なマーカー（JSからの参照用）。
*   **【4】スタイル・状態反映系**
    *   `data-state`: UIの見た目の状態（`active`, `open` 等）。
    *   `data-status`: ビジネスロジックの進行状態（`loading`, `success` 等）。

### 8. 汎用パーサー・ルーター戦略
- **routPatch**: 初期化時のみ属性をパースし、更新関数をクロージャとして登録。State変更時は直接実行し高効率な差分同期を実現。
- **routEvent**: イベントの `e.type` と要素タグを評価し、click/change/input等の発火を自動判定・ルーティングする。
- **routBuilder**: `FormAddon` 等の動的構築を担い、構築完了マーカーを用いて二重初期化の破綻を完全に防ぐ。

### 9. 開発状況と次ステップ
- `Report`, `Dash`, `Tracer5i` の全画面において、レガシー属性（`data-arg`, `data-addon-*` 等）の排除と宣言的マークアップ（新4分類）への移行。
- `CoreUI` に各種汎用パーサーを実装し、`CoreAction` の `routEvent` において双方向バインディング（`data-patch`の`bind`パス抽出）およびイベント自動判定を構築
- **次のステップ**: dataset.の呼び出しも含めてルールに当てはまらないレガシー属性の完全撲滅と後方互換用処理を撤去。

---
