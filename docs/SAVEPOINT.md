# SAVEPOINT: OBPLOT1.0

## 🎯 Target: Both (Thinker & Coder) - 共通の事実ベース

### 1. ディレクトリ構造と関数一覧（モジュール責務）
- **[A:Coreモジュール]** (汎用基盤):
  - `Code.js`: [API] バックエンドAPI (GAS通信, I/O, サイドバー起動)
  - `PlatformAdapter.html`: [Infra] API/Storageのアダプター・環境DI
  - `Model.html` (`CoreModel`相当): [Model] 状態管理 (`State`)・グローバル定数
  - `CoreAction.html`: [Controller] システム基盤（ルーター、アクションパイプライン、初期化DIリゾルバ）
  - `CoreUIAutomator.html`: [View Engine] スキーマに基づくPatch型差分同期エンジン・動的属性バインダー (dataset対応)
  - `CoreMethod.html`: [Logic] 汎用ユーティリティ（計算・配列操作）
  - `Component.html`: [Component] Web Components (`ObPopover`等)・Lazy Dialog Injection
  - `Chart.html`: [Component] グラフ描画 (`<ob-cal-plot>`)
- **[B:Tab1/Tab2 特化モジュール]**: `Sidebar_Tracer.html`, `T1T2_Schema.html`, `T1T2_Action.html`, `T1T2_Method.html`
- **[C:Tab3/Report 特化モジュール]**: `Sidebar_Dash.html`, `T3_Schema.html`, `T3_Action.html`, `T3_Method.html`, `Report.html`, `Report_Schema.html`, `ReportApp.html`, `ReportCSS.html`

### 2. フェーズ・ステートマシン（状態遷移定義）
- **Tab 1 (データ抽出)**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
- **Tab 2 (グラフ作成)**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5) -> STANDARDIZED(6)`
- **Tab 3 (ダッシュボード)**: `INIT(1) -> LOADED(2)`

---

## 🧠 Target: Thinker - 設計・アーキテクチャ情報

### 3. システム・アーキテクチャ詳細 (State-Driven & Schema-Driven)
- **単方向データフロー**: `Action (ビジネスロジック) -> State (状態更新) -> CoreUIAutomator (DOM自動反映)` の一方通行フローを徹底。Action層から直接DOM操作 (`style.display`, `textContent`, `classList`等) を行うことを厳格に禁止。
- **状態管理**: `State` による厳格なObserverモデル。UI表示用データや一時状態もすべて階層化して保持。
- **プレゼンテーション**: 各画面専用の `SCHEMA` オブジェクトにフェーズ制約 (`visiblePhase`, `activePhase`等) とプロパティバインディング (`text`, `className`, `dataset`) を宣言。動的生成要素であっても生成時にSCHEMAへ定義を登録し、`CoreUIAutomator` を介してリアルタイムにPatch同期する。
- **汎用コアの完全抽象化 (DI)**: A:Coreモジュールをライブラリ化し、B・CはAを読み込む別アプリとして稼働。`CoreAction` の `configResolver` を通じて初期化時に設定を注入する。
- **グラフレポートの独立**: Excel版での動作を保証するため、グラフレポート (ReportApp) は本体アプリケーションから独立した単一のHTML (SPA) として実装。

- **フラットHydration (状態の永続化と復元)**: `CoreMakeBU` と `SCHEMA` の `persistPaths` 定義を用いた自動復元機構。ワイルドカード等を利用し、複雑なネスト状態をフラットなJSONとして保存・動的復元することで、初期化フローをスリム化・強固にする。

### 4. マルチ環境実装原理（excellECS.md）
- `PlatformAdapter.html` によるAPI (通信) と Storage (永続化) の環境ごとの動的切り替え。
- `infra/build.js` による自動ビルド機構（Excel環境のCSP制限回避と純粋な静的HTMLの生成）。

### 5. コア・コントラクト（処理フロー上の規約）
- **ドメインロジック分離**: ドメイン固有処理は `T1T2_Method` / `T3_Method` へ、汎用計算は `CoreMethod` へ完全分離。入力から出力を返す純粋関数として実装し、外部状態・DOMに依存させない。
- **アクション・パイプライン**: 確認ダイアログや非同期処理を伴うアクションは、必ず `CoreAction.withAsync` を経由する。

### 6. 開発状況と次ステップ
- **現状**: Phase1〜4の大改修（完全スキーマ駆動化、DashboardのUIAutomator適用、フラットHydration導入、PDF出力完全初期化ロジック）が完了し、安定動作を確認済。
- **次ステップ**: さらにコード全体を見直し、状態(State)とUI連動の依存関係が壊れないよう配慮しながらの最適化・拡張作業。

---

## 💻 Target: Coder - 実装特化の具体ルール

### 7. プロジェクト固有のコーディング規約
- **完全スキーマ駆動の厳守**: 命令的な分岐やDOM操作は避け、必ず `SCHEMA` オブジェクトの関数（`activePhase`, `disablePhase`, `visiblePhase`, `className`, `text`, `dataset`等）を使用すること。
- **モダン構文と情報密度**: ES6+モダン構文 (`?.`, `??`等) を多用し `var` を排除。無駄な空行を削除し、簡潔なインラインコメント (`// --- 役割 ---`) で情報密度を最大化する。
- **文字化け防止 (ファイル操作規則)**: 
  - ファイルの新規作成・部分書き換えを行う際は、ターミナルコマンド（`echo`, `cat`, `Out-File`等の出力リダイレクト）を絶対に使用しないこと。
  - 必ずエージェントの専用ファイル編集ツールAPI（`replace_file_content` や `write_to_file` 等）を使用して安全なUTF-8操作を行うこと。
  - コード内の日本語コメントや文字列を破壊・変更しないこと。
