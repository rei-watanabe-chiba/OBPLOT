# SAVEPOINT: OBPLOT1.0

## 🎯 Target: Both (Thinker & Coder) - 共通の事実ベース

### 1. ディレクトリ構造と関数一覧（モジュール責務）
- **[A:Coreモジュール]**:
- `Code.js`: [API] バックエンドAPI (GAS通信, I/O, サイドバー起動)
- `PlatformAdapter.html`: [Infra] API/Storageのアダプター・環境DI
- `CoreModel.html`: [Model] 状態管理 (`AppState`)・グローバル定数
- `CoreAction.html`: [Controller] システム基盤（ルーター、パイプライン、初期化DIリゾルバ）
- `CoreUIAutomator.html`: [View Engine] スキーマに基づくPatch型差分同期エンジン・リアルタイムバインダー
- `CoreMethod.html`: [Logic] 汎用ユーティリティ（計算・配列操作）
- `Component.html`: [Component] DOMビルダー・Web Components・Lazy Dialog Injection
- `Chart.html`: [Component] グラフ描画 (`<ob-cal-plot>`)
- **[B:Tab1/Tab2 特化モジュール]**: `Sidebar_Tracer.html`, `T1T2_Schema.html`, `T1T2_Action.html`, `T1T2_Method.html`
- **[C:Tab3/Report 特化モジュール]**: `Sidebar_Dash.html`, `T3_Sidebar_Schema.html`, `T3_Action.html`, `T3_Method.html`, `Report.html`, `Report_Schema.html`, `ReportApp.html`, `ReportCSS.html`

### 2. フェーズ・ステートマシン（状態遷移定義）
- **Tab 1 (データ抽出)**: `INIT(1) -> READY(2) -> LOAD(3) -> INVALID(4) -> VALID(5) -> EXTRACT(6) -> OUTPUT(7)`
- **Tab 2 (グラフ作成)**: `INIT(1) -> LOADED(2) -> FILTERED(3) -> MAPPED(4) -> PREVIEWED(5)`
- **Tab 3 (ダッシュボード)**: `INIT(1) -> LOADED(2)`

---

## 🧠 Target: Thinker - 設計・アーキテクチャ情報

### 3. システム・アーキテクチャ詳細
- **SPA型 MVMS + Web Components + Presenter**
- **状態管理**: `AppState` による厳格なObserverモデル。状態はセクションごとに階層化し、軽量なrefsとphaseのバックアップを行う。
- **プレゼンテーション**: 各画面専用の `SCHEMA` オブジェクトにフェーズ制約を宣言。`data-bind-*` 属性を用い、`CoreUIAutomator` を介してリアルタイムかつ差分のみをPatch同期する。
- **汎用コアの完全抽象化 (DI)**: 最終的にA:Coreモジュールをライブラリ化、B・CをAを読み込む別々のアプリとして配布するため、`CoreAction` に `configResolver` を実装し、ツール（呼び出し元）側が初期化時に設定を注入する。
- **グラフレポートの独立（repoECS.md）**: Excel版での動作を保証するために、グラフレポートは本体アプリケーションから完全に独立して稼働する単一のHTML（SPA）として実装する。

### 4. マルチ環境実装原理（excellECS.md）
- `PlatformAdapter.html` によるAPI (通信) と Storage (永続化) の環境ごとの動的切り替え。
- `infra/build.js` による自動ビルド機構（Excel環境のCSP制限回避と純粋な静的HTMLの生成）。

### 5. コア・コントラクト（処理フロー上の規約）
- **ドメインロジック分離**: ドメイン固有処理は `T1T2_Method` / `T3_Method` へ、汎用計算は `CoreMethod` へ完全分離。
- **派生状態（Derived State）の厳守**: UI表示用データは `State` の別パスとして保存し、直接的なDOM書き換えアクションを禁止。
- **アクション・パイプライン**: 確認ダイアログや非同期処理を伴うアクションは、必ず `CoreAction.confirmAndExecute` を経由する。

### 6. 開発状況と次ステップ
- **現状**: ROADMAP.mdのレガシーコードを排除した最適化コードについて、Tab1〜Tab3までの動作確認完了。
- **次ステップ**: tab3 Reportのエラーをユーザーとの対話形式で原因特定しリファクタリングする。

---

## 💻 Target: Coder - 実装特化の具体ルール

### 7. プロジェクト固有のコーディング規約
- UI IDのイミュータブルな定数化（エントリーポイントでの単一カプセル化）は可読性向上のため許可する。
- プライベートクラスフィールド (`#`) を積極的に使用し、内部状態を隠蔽すること。
- フェーズに基づくUI制御を行う際は、命令的な分岐ではなく、必ず `SCHEMA` オブジェクトの `activePhase`, `disablePhase`, `visiblePhase` 関数を使用すること。
