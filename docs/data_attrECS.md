# DataAttribute_Design.md

## A. data-属性の新分類
全体を走査し、既存の乱立していた属性を以下の4種7個（主属性）＋オプション属性（従）にマッピング・統合します。

### 1. State操作・イベント発火系
※引数が必要な場合は `data-param`, `data-sub-param` (最大2つ) に統合する。

* **1-1.`data-action`**: 単発のイベント発火（ボタンクリック等）
  * **該当（統合される）属性**: `data-action`, `data-change-item`, `data-change-all`
* **1-2.`data-bind`**: Stateとの双方向/単方向データ結合（フォーム入力、自動反映等）
  * **該当（統合される）属性**: `data-bind`, `data-bind-ctx`, `data-change`

### 2. UI変更・構築系
※設定が必要な場合は `data-opts="key:val; key2:val2"` (1つのみ) に統合する。

* **2-1.`data-ui`**: HTML構造そのものを動的に生成・マウントするトリガー。
  * **該当（統合される）属性**: `data-ui` (値として `dlg`, `mselect`, `segment`, `table`, `symbtbl`, `addon` 等をとる)
* **2-2.`data-patch`**: 既存のDOMに対して、Stateの値を元に動的な変更（テキスト、クラス、disabled状態など）を加えるトリガー。
  * **該当（統合される）属性**: `data-bind-status`, `data-bind-opts`, `data-bind-src`, `data-bind-stats`, `data-bind-errs`, `data-bind-invalid`, `data-bind-fields`

### 3. DOM参照・識別系
※オプション属性を持たない（禁止）。

* **3-1.`data-part`**: 要素の特定・クエリ用。機能を持たない純粋なマーカー。
  * **該当（統合される）属性**: `data-part`

### 4. スタイル・状態反映系
※オプション属性を持たない（禁止）。CSSの起点としてJSから書き込まれる。

* **4-1.`data-state`**: UIコンポーネントの見た目の状態（active, open, hidden等）。
  * **該当（統合される）属性**: `data-state`, `data-theme`, `data-board-mode`
* **4-2.`data-status`**: ビジネスロジックや通信結果の状態（loading, success, error等）。
  * **該当（統合される）属性**: `data-status`

---
*(廃止・オプションへ吸収される属性群)*
`data-arg`, `data-target`, `data-key`, `data-name`, `data-rule-key`, `data-symbol-idx`, `data-symbol-type`, `data-aspect-idx`, `data-sync-group`, `data-panel-id`, `data-tab`, `data-sub`, `data-result`, `data-addon-icon`, `data-addon-prefix`, `data-addon-suffix`, `data-addon-color`, `data-addopt-size`, `data-renderer`


## B. 汎用関数（ルーター）の導入
各主属性を安全かつ効率的に処理するための汎用ルーター・パーサーの設計です。

### 1. routPatch（2-2. data-patch用）
* **格納先ファイル**: `src/CoreUI.html`
* **改修前のリスク**:
  State更新のたびにDOMの属性を再パースして更新処理を振り分けると、処理遅延が発生する。また、不要なDOM操作が都度走ることで、input要素のフォーカスが外れるなどのUI破綻が起きるリスクがある。
* **解決策**:
  初期化（build）時のみ属性をパースし、「どの要素に」「どの更新関数を適用するか」をクロージャとして生成・登録するファクトリパターンを採用。状態変更時は関数を直接実行し、高効率な差分同期を実現する。

### 2. routEvent（1-1.data-action, 1-2.data-bind 用）
* **格納先ファイル**: `src/CoreAction.html` (`rootGLB`内)
* **改修前のリスク**:
  `click` と `change` の属性を統合した場合、どのイベントタイプでビジネスロジックを発火させるべきかの識別ができず、予期せぬタイミングで処理が走る、あるいは発火しないという破綻が生じる。
* **解決策**:
  発火したイベントの `e.type` と要素の `tagName` (SELECT, INPUT, BUTTON等) および `type` 属性を評価し、イベントを自動判定して適切なアクションへルーティングする処理を中央イベント監視に挟む。

### 3. routBuilder（2-1.data-ui用）
* **格納先ファイル**: `src/CoreUI.html`
* **改修前のリスク**:
  動的構築（MSelectやFormAddonなど）を単一の汎用ルーターで処理した場合、タブ切り替え時などに再度初期化処理が走り、DOMがネストして増殖する（二重構築）という致命的な破綻が起こり得る。
* **解決策**:
  ルーター内に、構築完了マーカー（例: `el.__uiBound = true`）をDOMに付与するシステムルールを強制する。構築済み要素はスキップすることで、リセットや再描画時の安全性を完全に担保する。

### 4. routOptions（オプション属性パース用）
* **格納先ファイル**: `src/CoreUI.html` (`CoreUIPatcher`クラス内)
* **改修前のリスク**:
  `data-opts="icon:analytics; color:red"` のような独自記法を各コンポーネントが個別に `split` して処理すると、記述が重複しDRY原則に反する。将来エスケープ仕様などを変更した際に全コードが破綻する。
* **解決策**:
  文字列を受け取り、最初のコロンのみをキーと値の区切りとして解釈してオブジェクト `{icon: "analytics", color: "red"}` を返す、単一の純粋関数（パーサー）を用意し、すべてのオプション解析をここに集約する。
