# SAVEPOINT: OBPLOT1.0

## 🎯 Target: Both (Thinker & Coder) - 共通の事実ベース

### 1. ディレクトリ構造とファイル一覧（モジュール責務）
- **[A:Coreモジュール]** (汎用基盤):
  - `Code.js`: [API] バックエンドAPI (GAS通信, I/O, サイドバー起動)
  - `PlatformAdapter.html`: [Infra] API/Storageのアダプター・環境DI
  - `Global.html`: [Config] アプリケーション全体のグローバル設定・定数 (`GLB`)
  - `Model.html`: [Model] 状態管理 (`State`)
  - `CoreAction.html`: [Controller] システム基盤（ルーター、アクションパイプライン、初期化DIリゾルバ）
  - `CoreUI.html`: [View Engine] スキーマに基づくPatch型差分同期エンジン・動的属性バインダー・Stateless Patcher
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
- **単方向データフロー**: `Action (ビジネスロジック) -> State (状態更新) -> CoreUI (DOM自動反映)` の一方通行フローを徹底する。Action層から直接DOM操作を行うことは厳格に禁止する。
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

### 6. 開発状況と次ステップ
- **現状**: UIコンポーネントにおけるWeb Components方式を撤廃してStateless Patcherパラダイムへの移行を完了。同時に、名前空間のフラット化、高階関数によるロジックの極小化、およびリアクティビティに伴うスタッター解消（デバウンス適正化）を実施。強固な単方向アーキテクチャが完成し、安定動作を確認済。
- **次ステップ**: Rport.htmlのグラフ描画ロジックにおける検量線と判別図の分離

---

## 💻 Target: Coder - 実装特化の具体ルール

### 7. プロジェクト固有のコーディング規約
- **完全スキーマ駆動の厳守**: 命令的な分岐やDOM操作は避け、必ず `SCHEMA` オブジェクトの関数（`activePhase`, `disablePhase` 等）を使用すること。
- **モダン構文と高密度コーディング**: ES6+モダン構文 (`?.`, `??` 等) を多用し `var` を排除。無駄な空行を削除する。さらに `NAMEMASTER.md` に従い、ローカル変数には極小化・子音抽出 (`v`, `e`, `pld`, `cfg` 等) を徹底し、コードの情報密度を最大化すること。
- **文字化け防止 (ファイル操作規則)**: 
  - ファイルの新規作成・部分書き換えを行う際は、ターミナルコマンドを絶対に使用しないこと。
  - 必ずエージェントの専用ファイル編集ツールAPI（`replace_file_content` や `write_to_file` 等）を使用して安全なUTF-8操作を行うこと。
  - コード内の日本語コメントや文字列を破壊・変更しないこと。
