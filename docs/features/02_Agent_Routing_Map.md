# 02_Agent_Routing_Map.md

## 1. エージェント間の連携フロー
ユーザーの要望を受けたRouterは、このマップを参照して「どのファイルの、どの処理に関する変更か」を特定し、Explorerに対して具体的な検索クエリを指示します。Explorerが取得した該当箇所のコードをRouterが評価し、Corderに改修指示を出します。

## 2. Explorer向け検索ツール活用ガイド
Explorer自身によるgrep_searchは絶対禁止であり、必ず `mcp_jev-mcp-server_*` ツールを利用すること。別途作成されている index型関数一覧（ファイルと行位置）も併用し、対象を絞り込みます。
* **mcp_jev-mcp-server_* (MCPツール):**
  * **用途:** 複雑なJSON構造、Stateの定義（初期値）、設定オブジェクト内の特定のキーや構造を正確に検索・抽出する場合に使用します。

## 3. 要望別ルーティング辞書

### A. UI/見た目・レイアウトの変更
* **Routerの思考:** HTML構造の変更か、CSSスタイルの変更かを判断。
* **Explorerへの指示:**
  * CSS変更の場合: `CSS.html` 内の対象クラスやCSS変数をgrep。
  * DOM変更の場合: `Component.html` 内の `Tpl` クラスの該当メソッド、または各機能のHTMLファイル (`Tracer5i.html`, `Dash.html`, `Report.html`) の静的DOMをgrep。

### B. ユーザー操作（ボタン・入力）の挙動変更
* **Routerの思考:** ユーザー操作は `data-action` でバインドされている。対象のメソッド名を特定する必要がある。
* **Explorerへの指示:**
  * 対象UI要素の `data-action` 属性値をgrepで特定（例: `DashAct.xxx`, `CoreAct.xxx`）。
  * 特定したメソッド名を `Code.js` または 各種 `_App.html` 内からgrep検索し、ロジックを抽出。

### C. データの保持・状態（State）に関する変更
* **Routerの思考:** データは `CoreState.html` の `AppSt` クラスで管理されている。
* **Explorerへの指示:**
  * 対象となる入力項目の `data-out` 属性をgrepし、バインドされているStateパス（例: `ENTST.RAW.refs.file`）を特定。
  * `CoreState.html` 内の初期化定義、またはそれを参照しているロジックをgrep。
  * 設定構造の正確な把握には jev choice も活用。

### D. グラフ描画・レポートに関する変更
* **Routerの思考:** 描画ロジックは Report層 (`Chart.html`, `Report_Logic.html`) に集約されている。
* **Explorerへの指示:** `04_Report_and_Drawing_Logic.md` を参照し、関連する計算メソッドやECharts設定生成部をgrep。
