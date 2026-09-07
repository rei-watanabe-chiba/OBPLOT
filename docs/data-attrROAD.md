確定した基本設計（DataAttribute_Design.md）に基づき、既存機能を破壊せず、ステップバイステップでユーザーが動作確認を挟めるリファクタリング・ロードマップ
🗺️ リファクタリング・ロードマップ
いきなりHTML全体を書き換えてエラーの温床にすることを防ぐため、**「①新しいルーター（受け口）を作る」→「②部分的に適用する」→「③全体を書き換える」→「④古い処理を消す」**という安全な順序で構成する。
Step 1: 汎用パーサー・ルーターの基盤実装（バックエンド側）
 * 目的: 新ルール（data-param, data-opts, data-ui, data-patch）を解釈し、既存のステート管理や関数へ繋ぎ込む「賢い受け口」を CoreUI と CoreAction に構築します。
 * 編集対象:
   * src/CoreUI.html (routPatch, routBuilder, routOptions の追加)
   * src/CoreAction.html (routEvent の追加と rootGLB のイベント自動判定化)
 * ユーザー確認タスク: この段階ではHTMLを書き換えないため、「既存のアプリの挙動が壊れていないか（エラーが出ないか）」の純粋な後方互換性テストをお願いします。
Step 2: 独立コンポーネント (FormAddon) の新ルール適用とCSS浄化
 * 目的: 影響が局所的で、今回の設計見直しのキッカケとなった FormAddon をターゲットに、新ルール（data-ui="addon" ＋ data-opts="..."）を適用し、CSSクラス名（.prefix-container 等）とロジックを設計書通りに浄化します。
 * 編集対象:
   * src/Component.html (Tpl.Form._wrapAddon の実装)
   * src/CoreUI.html (FormAddonのパッチ処理調整)
   * src/ReportCSS.html (クラス名の修正とスタイル調整)
 * ユーザー確認タスク: Report画面を開き、対象のフォーム要素に正しくアイコンやテキスト（単位）が付与され、レイアウト崩れが起きていないか視覚的な確認をお願いします。
Step 3: Report層の全面スリム化 (HTMLの書き換え)
 * 目的: Report.html および Report_APP.html 内の乱立している属性（data-arg, data-addon-*, data-bind-fields 等）を、Step 1で作った新ルールへ一斉に置換し、HTMLを劇的にスリム化します。
 * 編集対象:
   * src/Report.html (マークアップの全面書き換え)
   * src/Report_APP.html (必要に応じて)
 * ユーザー確認タスク: Report画面の各種操作（タブ切り替え、連動入力、UIの表示切り替えなど）が、書き換え前と全く同じように動作するか（Regressionがないか）確認をお願いします。
Step 4: 他画面 (Dash / Tracer5i) への波及
 * 目的: Report層の成功を受けて、残りの画面のHTMLも新ルールへ移行します。
 * 編集対象:
   * src/Dash.html, src/Dash_Action.html
   * src/Tracer5i.html, src/Tracer5i_Action.html
 * ユーザー確認タスク: ダッシュボードおよびデータ抽出・検量線画面での操作確認をお願いします。
Step 5: レガシー属性の完全撤廃 (クリーンアップ)
 * 目的: HTMLの移行が完了したため、CoreUI と CoreAction に残しておいた「古い属性（data-change, data-bind-fields 等）を処理するコード」を完全に削除し、JS側のコード量も削減します。
 * 編集対象:
   * src/CoreUI.html
   * src/CoreAction.html
 * ユーザー確認タスク: アプリ全体の最終通しテストをお願いします。
次のアクション
上記のロードマップで進行の合意をいただけましたら、【Step 1】 のコード（CoreAction.html と CoreUI.html に追加する汎用ルーター・パーサーの実装）を作成し、ご提示いたします。
ご指示をお願いいたします。
