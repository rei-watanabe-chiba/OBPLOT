# for gemini
### セーブポイント：OBPLOT1.1
## 1. 現在の設計要約・アーキテクチャ
- **実行環境**: Google Apps Script v8エンジン
- **フロントエンド**: HTML Service / サイドバーおよび別タブ（Blob URL展開）
- **描画エンジン**: Google Visualization API (CoreChart: ScatterChart)
- **アーキテクチャ**: SPA型 MVMSアーキテクチャ (Model, View, Method, Service)
- **状態管理**: `AppState` クラスによる Observer（Pub/Sub）パターン。`data-bind` 属性管理と一括UI更新処理。`APP_PHASE` 定数によるフェーズの一元管理。
- **UI思想**: Google Material Design準拠、CSS Gridレイアウト、固定カラーパレット。
- **通信方式**: `google.script.run` を Promise 化してラップ。async/await による厳密な非同期制御。
- **レポート展開方式**: `Report.html` をGASバックエンド経由で取得し、Blob URLを生成してデプロイ不要で別タブに描画。

## 2. ディレクトリ構造・ファイル一覧
- `Code.gs`: バックエンドデータ入出力・設定管理・テンプレート取得API
- `Sidebar.html`: サイドバーのHTML構造（`data-action`, `data-bind` 属性による宣言的UI・アクション定義）
- `CSS.html`: スタイル・トークン定義
- `Model.html`: 状態管理、UI定数管理、GAS通信ラップ
- `View.html`: DOM操作・state連動によるUI制御
- `Method.html`: 純粋関数ベースのデータ加工・バリデーション・データ抽出
- `Controller.html`: 非同期通信・ビジネスロジック制御、リアクティブな状態監視とフェーズ進行のメイン
- `Event.html`: グローバルなイベント移譲（Event Delegation）によるイベントディスパッチ・自動データバインド処理
- `Report.html`: 別タブで展開されるレポート画面（Google Visualization API によるサンプル散布図描画）

## 3. 次の開発作業
- Tab2開発に向けて設計書（ECS）のブラッシュアップと論理構成の確認は一時停止する
- 機能開発はいったん中断し、リファクタリングロードマップにしたがって既存コードを改修する

## 4. リファクタリングの注意点
- **イベント・状態連動の保護**: フォームコントロールのスタイルや構造変更時も、`querySelector` や `dataset.field` などのセレクタ依存部を維持し、リアルタイム変更検知を損なわない。

## 5. リファクタリングロードマップ
- **アプローチ**: <template> タグを活用した「純粋なDOMクローン生成」
- **概要**: View層の renderSelectors や renderCheckboxes などの内部にある「バッククォートでのHTML文字列組み立て（テンプレートリテラル）」を廃止します。代わりに Sidebar.html 内に <template id="checkbox-template"> としてベース構造を定義し、View層は「テンプレートを複製（cloneNode）してテキストを注入し、DOMに追加する」処理に徹します。
- **メリットと効果**: コード削減は微減（ただし構造は劇的にクリーンになる）。保守性は大幅向上。JSファイルの中からHTMLタグのベタ書きが消滅するため、「デザイン（CSS/HTML）の修正のためにJSを開く」必要がなくなります。
- **注意点**: 引数hasEmptyによる判定追加処理の欠落に注意
- **変更箇所**:
  - Sidebar.html: 非表示の <template> タグを追加定義。
  - View.html: HTML文字列の結合を廃止し、Node操作に変更。
