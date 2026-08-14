# for gemini
### セーブポイント：OBPLOT1.1
## 1. 現在の設計要約・アーキテクチャ
- **実行環境**: Google Apps Script v8エンジン
- **フロントエンド**: HTML Service / サイドバーおよび別タブ（Blob URL展開）
- **描画エンジン**: Google Visualization API (CoreChart: ScatterChart)
- **アーキテクチャ**: SPA型 MVMSアーキテクチャ (Model, View, Method, Service)
- **状態管理**: `AppState` クラスによる Observer（Pub/Sub）パターン。`APP_PHASE` 定数によるフェーズの一元管理。
- **UI思想**: Google Material Design準拠、CSS Gridレイアウト、Oat UIのセマンティックなコンポーネント・CSSを基盤とし、ブランドカラーを維持。
- **通信方式**: `google.script.run` を Promise 化してラップ。async/await による厳密な非同期制御。
- **レポート展開方式**: `Report.html` をGASバックエンド経由で取得し、Blob URLを生成してデプロイ不要で別タブに描画。

## 2. ディレクトリ構造・ファイル一覧
- `Code.gs`: バックエンドデータ入出力・設定管理・テンプレート取得API
- `Sidebar.html`: サイドバーのHTML構造
- `CSS.html`: スタイル・トークン定義
- `Model.html`: 状態管理、UI定数管理、GAS通信ラップ
- `View.html`: DOM操作・state連動によるUI制御
- `Method.html`: 純粋関数ベースのデータ加工・バリデーション・データ抽出
- `Controller.html`: 非同期通信・ビジネスロジック制御、ボタン押下で発火するstate操作、フェーズ進行のメイン
- `Event.html`: ボタン押下以外のイベント監視・ハンドリング・各エリアの入力値処理
- `Report.html`: 別タブで展開されるレポート画面（Google Visualization API によるサンプル散布図描画）

## 3. 次の開発作業
- Tab2開発に向けて設計書（ECS）のブラッシュアップと論理構成の確認
- Tab2 シンボルマッピング（SymbolMapArea）まで実装完了
- 機能開発はいったん中断し、oat.UIを活用したUIのモダン化のための設計すり合わせを優先する
- 
## 4. UIのモダン化のアプローチ
- **Oat UI 活用の段階的アプローチ**: 一気に全改修するのではなく、セレクタ依存部（Event/View層）を完全に保護しながら、局所的なコンポーネント・CSSスタイルから段階的にトーンを確認する。
- **ブランドカラーの完全維持**: 既存のカラーパレットをCSS変数として堅持し、Oat UIのセマンティックなデザインに調和させる。
- **サイドバーUIへの準拠**: 300pxのサイドバー内においてUXを意識して文字サイズや間隔を整える。
- **イベント・状態連動の保護**: フォームコントロールのスタイルや構造変更時も、`querySelector` や `dataset.field` などのセレクタ依存部を維持し、リアルタイム変更検知を損なわない。
