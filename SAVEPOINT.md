# for gemini
### セーブポイント：OBPLOT1.1
## 1. 現在の設計要約・アーキテクチャ
- **実行環境**: Google Apps Script v8エンジン
- **描画エンジン**: Google Visualization API (CoreChart: ScatterChart)
- **計算ライブラリ**: simple-statistics
- **フロントエンド**: HTML Service / サイドバーおよび別タブ（Blob URL展開）
- **アーキテクチャ**: SPA型 MVMSアーキテクチャ (Model, View, Method, Service)
- **状態管理**: `AppState` クラスによる Observer（Pub/Sub）パターン。カスタム属性と`APP_PHASE` 定数による一元管理
- **UI思想**: Google Material Design準拠、CSS Gridレイアウト、固定カラーパレット。
- **イベント駆動**: 
  - 宣言的UIアプローチを採用し、完全な属性ベースのイベントルーティングを実現。DOM階層（`closest`等）に依存しない設計。
  - **静的要素**: アクション（ボタン等）はHTML側に `data-action` をハードコード。
  - **動的要素**: リアクティブ要素（設定SelectやCheckbox等）は、JavaScript（`UIController`）による生成時に `data-bind` や `data-change` 属性を動的に付与。
- **ビジネスロジック**: `Method.html` はDOMアクセスや環境依存から完全に分離された純粋な関数・クラス化。
- **通信方式**: `google.script.run` を Promise 化してラップ。async/await による厳密な非同期制御。
- **レポート展開方式**: `Report.html` をGASバックエンド経由で取得し、Blob URLを生成してデプロイ不要で別タブに描画。
- **コーディングスタイル**: コード量の節約を考慮して、保守性と設計思想を保ちつつ統合・共通化、高級言語の仕様とモダンな記述方法を採用する。ただし、深すぎるネストは避けて、全体のトーンを統一する。

## 2. ディレクトリ構造・ファイル一覧
- `Code.gs`: バックエンドデータ入出力・設定管理・テンプレート取得API
- `Sidebar.html`: サイドバーのHTML構造（動的コンテナの準備、静的アクション要素のハードコード）
- `CSS.html`: スタイル・トークン定義
- `Model.html`: 状態管理、定数管理、GAS通信ラップ
- `Component.html`: 汎用DOM操作・汎用動的UI生成
- `View.html`: State連動によるUI制御、動的要素へのカスタム属性付与・レンダリング処理
- `Method.html`: 純粋関数ベースのデータ加工・バリデーション・データ抽出（UI非依存）
- `Controller.html`: 非同期通信・ビジネスロジック制御、フェーズ進行のメイン（State駆動）
- `Event.html`: グローバルなイベント移譲。`data-action` / `data-change` / `data-bind` 属性に基づいたルーティングとリアクティブな状態更新
- `Report.html`: 別タブで展開されるレポート画面（Google Visualization API によるサンプル散布図描画）

## 3. 次の開発作業
- 1. View.htmlの動的要素生成について、依存stateの変更タイミング、生成タイミングを整理してUIStateUpdaterとUIInitの責務分担を整理する
- 2. PhaseダウングレードによるState初期化とそれに対応するUI初期化処理の汎用関数を設計して1に活用する
- 3. PhaseとPhase以外のstateの連携可能性について検討する
- 4. 3と同時進行でModel.htmlと依存関係にあるView.htmlとEvent.htmlの処理の整理により保守性向上とコード量削減可能性を探る
- 5. 大規模な改修となるため、論理構成の確立を優先し、既存処理の洗い出しと消滅・衝突可能性を十分に検討すること。
- 6. 必要に応じて段階的な改修ステップを提案すること。


