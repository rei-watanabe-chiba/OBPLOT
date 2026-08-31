# ROADMAP.md: OBPLOT1.0 Schema-Driven Refactoring

## 1. SAVEPOINT.md からの主要な変更点

### 1.1 アーキテクチャと状態管理の進化
* **変更前:** UI状態制御は `data-action` や `data-ui` 属性に基づくイベントルーターと相対DOM参照エンジンによって行われていた（Report層のみ `UIAutomator` を採用）[cite: 1]。
* **変更後:** 全層（Tab1, Tab2, Tab3, Report）において、`UI_SCHEMA` と `UIAutomator` をコアとする「スキーマ駆動アーキテクチャ」に完全統合する。泥臭いDOM操作を根絶し、双方向データバインディングとイベントバインドを全自動化する。

### 1.2 ファイル構成・モジュール責務の再編 (A, B, Cへの分離)
システムの責務を「汎用コア（A）」と「独自ツール（B/C）」に明確に分割する。

* **A（共通コアエンジン）**:
    * `CoreModel.html`: `AppState` 基盤および通信・永続化インターフェース[cite: 1]。
    * `CoreAction.html`: 肥大化していた `Controller.html` と `Event.html` を統合[cite: 1]。スキーマ駆動前提のアクションルーティングと非同期フロー管理を一手に担う。
    * `CoreUIAutomator.html`: 現在の `ReportLogic.html` にあるバインディングエンジンを汎用化して昇格[cite: 1]。
    * `CoreMethod.html`: 回帰計算、データ変換など、ドメインに依存しない純粋な共通ユーティリティ[cite: 1]。
    * `Component.html`, `Chart.html`, `CSS.html`: 全環境共通のUIコンポーネント群[cite: 1]。
* **B（Tab1, 2 特化ツール / Tracer5i用）**:
    * `T1T2_Schema.html`: Tab1, Tab2固有の UIを定義した配列オブジェクト。
    * `T1T2_Method.html`: データ抽出・検量線補正に特化したビジネスロジック。
    * `AppTracer.html`: ビルド時のB用エントリーポイント。
* **C（Tab3 汎用ツール / Dashboard用）**:
    * `T3_Schema.html`: ダッシュボード固有の UI定義配列[cite: 1]。
    * `T3_Method.html`: 汎用レポートデータ生成ロジック[cite: 1]。
    * `AppDash.html`: ビルド時のC用エントリーポイント。

### 1.3 実行環境・ビルドパイプラインの変更
* **変更前:** `infra/build.js` により単一の `App.html` を生成し、URLパラメータ（`?mode=`）で擬似的に切り替えていた[cite: 1]。
* **変更後:** `infra/build.js` を改修し、A+Bの結合である `App_Tracer.html` と、A+Cの結合である `App_Dash.html` を完全に独立して出力する。これに伴い、Excel用マニフェストも特化用と汎用用で2系統に分離して配布する。

---

## 2. リファクタリング・ロードマップ（段階的稼働テスト）

### Phase 1: コアエンジン (A) の抽出と統合基盤の構築
* **タスク**:
  1. `Controller.html` と `Event.html` を統合し、`CoreAction.html` を作成する[cite: 1]。
  2. `ReportLogic.html` に存在する `UIAutomator` を汎用化し、`CoreUIAutomator.html` としてコアに配置する[cite: 1]。
  3. `Method.html` を走査し、システム共通のロジックのみを `CoreMethod.html` に抽出する[cite: 1]。
* **動作確認 1**:
  * 既存のダッシュボード機能（Tab3/Report）を新しいコアエンジン (A) 上にマウントし、データの読み込みとグラフ描画が正常に同期されるか確認する（コア機能の最小構成テスト）。

### Phase 2: 特化型ツール (B) のスキーマ駆動化とロジック分離
* **タスク**:
  1. 既存の `View.html` (`UIPhase`) で管理されていたUI状態制御を廃止し、Tab1, Tab2 のHTML構造を `T1T2_Schema.html` に定義する[cite: 1]。
  2. 抽出および検量線に関する固有ロジックを `Method.html` から `T1T2_Method.html` へ移動する[cite: 1]。
* **動作確認 2**:
  * GASのデバッグ環境で B (Tab1, Tab2) のみを起動する。Fileシートの読み込みから抽出、検量線プレビューまでの状態遷移・バリデーションが、新しい `CoreUIAutomator` 経由でエラーなく完走するかテストする。

### Phase 3: ビルドパイプラインとマニフェストの分割
* **タスク**:
  1. `infra/build.js` を改修し、B用 (`App_Tracer.html`) と C用 (`App_Dash.html`) をそれぞれ出力するロジックを実装する[cite: 1]。
  2. `manifest.xml` を `manifest_tracer.xml` と `manifest_dash.xml` に分割・最適化する[cite: 1]。
* **動作確認 3**:
  * ローカルでのビルド (`node infra/build.js`) 実行。生成された2つのHTMLに、office.js と固有スキーマが正しく注入されているか目視確認する[cite: 1]。
  * Web版Excel（ローカル共有カタログ）に2つのマニフェストを登録し、それぞれのアドインが独立して起動するかテストする。

### Phase 4: GASライブラリ化の確立と総合テスト
* **タスク**:
  1. コアエンジン (A) を独立したGASプロジェクト（非公開ライブラリ）としてデプロイする[cite: 1]。
  2. ユーザー配布用のGASテンプレート側からAをライブラリ参照し、それぞれ独自の `onOpen` とHTML生成（`include`処理の中継）を実装する[cite: 1]。
* **動作確認 4 (最終)**:
  * エンドユーザーと同じ本番環境（GASカスタムメニュー経由、Excelアドイン経由）で、BとCの全てのフローが一気通貫で正常に動作することを確認する。
  * 
### 開発状況
* **現在地点**:
   * Phase 1: コアエンジン (A) の抽出と統合基盤の構築が終了
   * Phase 2について以下の引継ぎロジックの適用を試みたところボトルネックに到達して停止

### Phase 2における「オリジナルstate-UI駆動」から「スキーマ駆動」への変更ロジックの引継ぎ
* **オリジナルの仕組み（旧 `View.html` / `Controller.html`）:**
* 各セクションの開閉状態やUI要素の活性・非活性は、`UIPhase` クラス内の命令的なルールマップ（`#T1_RLS` / `#T2_RLS`）と `#apply` メソッドによって直接DOM属性（`data-state`, `disabled` など）を書き換えて制御していました。
* Stateの変更監視（`UIStateUpdater`）は、特定のデータ変更（`pxrfDT` や `corrDT` など）をトリガーに、必要な部分のフォーム再構築や値の同期を手動で行う分散型の設計でした。
* **Phase 2での変更点（新 `CoreUIAutomator` と `T1T2_SCHEMA`）:**
* 分散していたUIの定義やフェーズ制御ルールを、単一の設定オブジェクト（`T1T2_SCHEMA`）に集約しました。
* フォーム部品の構築、イベントの委譲、双方向データバインディングの管理を、汎用エンジンである `CoreUIAutomator` を経由して一元管理（スキーマ駆動化）する仕組みに変更しました。

#### ボトルネックとなる未解決事象
* **「raw層でフェーズダウンしたときにprev層がdisableではないがクリックできない」現象**
* **事象:** Tab2でプレビュー（prev層）まで進行した状態から、再度「raw層（データ読込・選択）」に戻ってフィルターを再確定（フェーズダウン）させ、再びシンボル確定を経てprev層に再突入した際、prevセクションおよびcalbセクション内のUI（ボタン、セレクトボックス等）が、視覚的にはdisabled（グレーアウト表示）になっていないにもかかわらず、クリックや操作に対して一切反応しなくなる。
