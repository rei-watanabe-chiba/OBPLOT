# for gemini
### セーブポイント：OBPLOT1.1
## 1. 現在の設計要約・アーキテクチャ
- **実行環境**: Google Apps Script v8エンジン
- **描画エンジン**: Google Visualization API (CoreChart: ScatterChart)
- **計算ライブラリ**: simple-statistics
- **フロントエンド**: HTML Service / サイドバーおよび別タブ（Blob URL展開）
- **アーキテクチャ**: SPA型 MVMSアーキテクチャ (Model, View, Method, Service)
- **状態管理**: `AppState` クラスによる Observer（Pub/Sub）パターン。State定義をセクション単位（`dataset`, `symbol` 等）で階層化し、フェーズ後退時には `reset()` メソッドを用いて明示的かつ安全に指定セクションを初期化する設計。
- **UI思想**: Google Material Design準拠、CSS Gridレイアウト、固定カラーパレット。
- **イベント駆動とUI連動**: 
  - **宣言的UIアプローチ**: 完全な単方向データフローとDOM階層に依存しない設計。
  - **静的アクション**: ボタン等のトリガーはHTML側に `data-action` をハードコードし、`Event` ルーターが機能。
  - **宣言的UIバインディング**: HTMLに付与したカスタム属性 (`data-v-show`, `data-v-dis` 等) を `UIAutoBinder` が初期化時に走査し、Stateと自動同期。
  - **フェーズ制御**: 状態遷移に伴うUIの活性・非活性ルールは、定数マップを用いた宣言的マッピングエンジンで制御。
  - **動的生成要素**: `UIStateUpdater` が、Stateの空状態 (`null`, `[]`) 検知時の自動クリーンアップ（フェイルセーフ）を含めて安全に再描画。
- **ビジネスロジック**: `Method.html` はDOMアクセスや環境依存から完全に分離された純粋な関数・クラス化。
- **通信方式**: `google.script.run` を Promise 化してラップ。async/await による厳密な非同期制御。
- **レポート展開方式**: `Report.html` をGASバックエンド経由で取得し、Blob URLを生成してデプロイ不要で別タブに描画。
- **コーディングスタイル**: 高階関数（ファクトリ関数）を用いたイベントハンドラの共通化や、最新のES仕様を活用しコード量を削減。保守性と可読性を最優先し、過度なネストを避けて全体のトーンを統一する。

## 2. ディレクトリ構造・ファイル一覧
- `Code.gs`: バックエンドデータ入出力・設定管理・テンプレート取得API
- `Sidebar.html`: サイドバーのHTML構造（動的コンテナ準備、静的actionのハードコード、`data-v-*` 属性による宣言的UIバインディングのマークアップ）
- `CSS.html`: スタイル・トークン定義
- `Model.html`: セクション単位で階層化された状態管理 (`AppState`)、ダウングレード時の明示的初期化基盤 (`State.reset`)、定数管理、GAS通信ラップ
- `Component.html`: 汎用DOM操作・汎用動的UI生成（データ空時の自動クリーンアップ・フェイルセーフ機構を内包）
- `View.html`: `UIAutoBinder` による宣言的属性の自動バインド、`UIPhase`（定数マップベースの宣言的ルール適用）、`UIStateUpdater` による動的要素のレンダリングと完全な責務分離
- `Method.html`: DOMアクセスから完全に分離された純粋関数ベースのデータ加工・バリデーション・データ抽出・計算ロジック
- `Controller.html`: 非同期通信・ビジネスロジック制御、フェーズ進行およびダウングレード時の明示的な状態リセットのオーケストレーション
- `Event.html`: グローバルなイベント移譲。高階関数（ファクトリ関数）を用いた省コード化と、`data-action` / `data-change` / `data-bind` 属性に基づく純粋なルーター・リアクティブ監視
- `Report.html`: 別タブで展開されるレポート画面（Google Visualization API によるサンプル散布図描画）

## 3. 次の開発作業
- 既存コードをリファクタリングを進める


