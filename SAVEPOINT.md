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
- `View.html`: DOM操作・State連動によるUI制御、動的要素へのカスタム属性付与・レンダリング処理
- `Method.html`: 純粋関数ベースのデータ加工・バリデーション・データ抽出（UI非依存）
- `Controller.html`: 非同期通信・ビジネスロジック制御、フェーズ進行のメイン（State駆動）
- `Event.html`: グローバルなイベント移譲。`data-action` / `data-change` / `data-bind` 属性に基づいたルーティングとリアクティブな状態更新
- `Report.html`: 別タブで展開されるレポート画面（Google Visualization API によるサンプル散布図描画）

## 3. 次の開発作業
- View.htmlが肥大化しているため、DOM.htmlを新設しclass DOMとclass UICreateを依存関係を整理しながら安全に移動する。
- 現状、class UIBuildInitとclass UIStateUpdaterにDOM動的生成が点在している。
- 点在する動的DOM生成を依存Stateと発火タイミングに注意して分類して、論理構成を整理する
- 整理状況を検討して、可能ならばstate依存型＋各Tabの最初期phaseについては、初期化処理を再整理する。
- 強制的ダウングレード等によるDOMの破棄が必要であれば、汎用的な関数を設定し組み込む形で対処する。
- 大規模改修になるため、既存機能の消滅とEvent.htmlとの依存関係について考慮したうえでリファクタリングに進んでください。


