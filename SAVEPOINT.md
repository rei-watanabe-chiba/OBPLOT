# for gemini
### セーブポイント：OBPLOT1.0
## 1. 現在の設計要約・アーキテクチャ
- **実行環境**: Google Apps Script v8エンジン
- **フロントエンド**: HTML Service / サイドバーおよび別タブ（Blob URL展開）
- **描画エンジン**: Google Visualization API (CoreChart: ScatterChart) ※サンプル描画確認済み
- **アーキテクチャ**: SPA型 MVMSアーキテクチャ (Model, View, Method, Service)
- **状態管理**: `AppState` クラスによる Observer（Pub/Sub）パターン。
- **UI思想**: Google Material Design準拠、CSS Gridレイアウト。
- **通信方式**: `google.script.run` を Promise 化してラップ。async/await による厳密な非同期制御。
- **レポート展開方式**: `Report.html` をGASバックエンド経由で取得し、Blob URLを生成してデプロイ不要で別タブに描画する方式を採用。
## 2. ディレクトリ構造・ファイル一覧
- `Code.gs`: バックエンドデータ入出力・設定管理・テンプレート取得API
- `Sidebar.html`: サイドバーのHTML構造
- `CSS.html`: スタイル・トークン定義
- `Model.html`: 状態管理（Observerパターン）, GAS通信ラップ
- `View.html`: DOM操作・state連動のUI描画
- `Method.html`: 純粋関数ベースのデータ加工・バリデーション
- `Controller.html`: 非同期通信・ビジネスロジック制御
- `Event.html`: イベント監視・ハンドリング・初期化
- `Report.html`: 別タブで展開されるレポート画面（Google Visualization API によるサンプル散布図描画）
