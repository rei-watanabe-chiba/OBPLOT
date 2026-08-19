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
- **概要**:Controller層の肥大化を防ぎ、全体のコード量削減と保守性向上を実現するために、呼び出し側（SidebarやEvent、Method）の改修も含めた以下のアプローチを実行する。下記5つのアプローチをすべて適用することで、現在の挙動を一切変えずに、Controllerの肥大化を解消し、MVCアーキテクチャの純度を最高水準に引き上げます。
- **アプローチ1：関数の単一責任化と data-arg の完全廃止**: getTab2Data を loadTab2Data と filterTab2Data に分割します。これに伴い、Sidebar側の data-arg 属性を廃止し、Event層のディスパッチャ（ルーター）から引数解析ロジックを削除して簡略化します。if/else のネストがなくなり単一責任原則（SRP）が満たされるため、保守性が大幅に向上します。ディスパッチャも軽量化されます。
- **アプローチ2：Method 層のTab別階層化とロジックの完全移譲**: Controller内に残存している「DOMからのデータ抽出（チェックボックス状態の配列化、シンボル設定の構築など）」や「バリデーション判定処理」をすべて Method.html へ移管します。その際、Method 内を Mtd.Tab1、Mtd.Tab2 のように静的クラス（名前空間）で階層化し、エリアごとの処理を明確に分離します。Controllerは「Stateの取得 → Methodの呼び出し → Stateの更新・API通信」のみを担う純粋なオーケストレーターとなり、コード量が劇的に削減されます。
- **アプローチ3：withAsyncLock の高階関数化（ステータスの自動解決）**: すべての非同期処理の最後で回手動で記述している State.set("....status", ["success", "完了メッセージ"]) を、withAsyncLock 側で巻き取ります。
- （変更前）コールバック内で State.set を実行。
- （変更後）コールバックの戻り値として成功メッセージ（文字列）を return し、withAsyncLock 側で一括して ["success", 戻り値] をStateにセットする。エラー時は catch ブロックで処理されるため、成功時の処理だけを純粋に記述できるようになります。全非同期メソッドに散らばっている定型文（ボイラープレート）が消滅し、コード量が大幅に削減されます。
- **アプローチ4：高度な分割代入（Destructuring）による変数のインライン化**: Stateからの複数値の取得や、Promise.all によるAPIレスポンスの受け取り時に、ES6の分割代入とプロパティ省略記法を極限まで活用し、一時変数の宣言を排除します。冗長な変数宣言がなくなり、コード行数が物理的に削減され、データフローが直感的に読めるようになります。（例）const [{data: pxrfData}, {data: wdxrfData}] = await Promise.all(...)
- **アプローチ5：Controller 自身のTab別モジュール（名前空間）分割**: 巨大化する AppController を Tab1Controller と Tab2Controller クラスに分割します。Event.html のディスパッチャ側で data-action="Tab1.loadFile" のようにドット区切りでメソッドを呼び出せるようルーティングを賢くし、単一ファイルの肥大化を根本から防ぎます。今後別機能が追加されてもクラスが肥大化せず、影響範囲（スコープ）をタブ単位で完全に閉じ込めることができます。

