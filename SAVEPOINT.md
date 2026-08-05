# for gemini
### セーブポイント：OBPLOT1.0

## 1. 現在の設計要約・アーキテクチャ
- **実行環境**: Google Apps Script v8エンジン
- **フロントエンド**:  HTML Service / サイドバーおよびダイアログ
- **描画エンジン(未実装)**: Google Visualization API (CoreChart: ScatterChart, ComboChart)
- **アーキテクチャ**: SPA型 MVMSアーキテクチャ (Model, View, Method, Service)
- **状態管理**: `AppState` クラスによる Observer（Pub/Sub）パターン。
- **UI思想**: Google Material Design準拠、CSS Gridレイアウト。
- **通信方式**: `google.script.run` を Promise 化してラップ。async/await による厳密な非同期制御。

## 2. ディレクトリ構造・ファイル一覧
- `Code.gs`: バックエンドデータ入出力・設定管理
- `Sidebar.html`: サイドバーのHTML構造
- `CSS.html`: スタイル・トークン定義
- `Model.html`: 状態管理（Observerパターン）, GAS通信ラップ・API群 
- `View.html`: DOM操作・state連動のUI描画
- `Method.html`: 純粋関数ベースのデータ加工・バリデーション
- `Controller.html`: 非同期通信・ビジネスロジック制御
- `Event.html`: イベント監視・ハンドリング・初期化
