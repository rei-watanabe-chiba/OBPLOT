# for gemini
### セーブポイント：OBPLOT1.1
## 1. 現在の設計要約・アーキテクチャ
- **実行環境**: Google Apps Script v8エンジン
- **フロントエンド**: HTML Service / サイドバーおよび別タブ（Blob URL展開）
- **描画エンジン**: Google Visualization API (CoreChart: ScatterChart)
- **アーキテクチャ**: SPA型 MVMSアーキテクチャ (Model, View, Method, Service)
- **状態管理**: `AppState` クラスによる Observer（Pub/Sub）パターン。`APP_PHASE` 定数によるフェーズの一元管理を導入。
- **UI思想**: Google Material Design準拠、CSS Gridレイアウト。
- **通信方式**: `google.script.run` を Promise 化してラップ。async/await による厳密な非同期制御。
- **レポート展開方式**: `Report.html` をGASバックエンド経由で取得し、Blob URLを生成してデプロイ不要で別タブに描画する方式を採用。

## 2. ディレクトリ構造・ファイル一覧
- `Code.gs`: バックエンドデータ入出力・設定管理・テンプレート取得API
- `Sidebar.html`: サイドバーのHTML構造（抽出層へ属性入力UIを移動、FOUC防止の初期状態適用済み）
- `CSS.html`: スタイル・トークン定義
- `Model.html`: 状態管理、フェーズ定義(`APP_PHASE`)、UI定数管理、GAS通信ラップ
- `View.html`: DOM操作・フェーズ連動(`updatePhaseUI`)によるUI一括制御、状態パスの自動マッピング
- `Method.html`: 純粋関数ベースのデータ加工・バリデーション・データ抽出
- `Controller.html`: 非同期通信・ビジネスロジック制御、フェーズの進行とダウングレード管理
- `Event.html`: イベント監視・ハンドリング・各エリアの入力値処理 (`processExacArea` 等)
- `Report.html`: 別タブで展開されるレポート画面（Google Visualization API によるサンプル散布図描画）

## 3. 開発状況
- UIの個別制御フラグを廃止し、`Phase 1` (INIT) ～ `Phase 5` (EXTRACT) までの5段階のフェーズ管理へ移行完了。
- Sidebarのデータ属性入力欄を抽出層へ移動し、UIフローと操作の一致を実現。
- FOUC（起動時のUIチラつき）を防止するため、Sidebar要素の初期非表示・無効化を適用。
- `View.html` におけるパス変換バグ（`_` から `.` への置換）を修正し、状態とUIの同期を復旧。
- `Controller.html` における非同期処理と同期処理の分離、および `Method.html` の引数名リネーム（`configMap` -> `exacMap`）等のリファクタリングを完了。
