# GAS to Office Web Add-in 実装要件定義書

## 1. 実行環境
同一フロントエンドで2環境稼働を実現する。
  - GAS環境：V8 Runtime / HtmlServiceを利用。
  - Excel環境：Office Web Add-inを利用。

## 2. 開発者が用意するもの
配布・実行環境とアドイン設定を整備する。
  - GitHub公開リポジトリ：ソースの一元管理とPages公開。
  - 自作アイコン画像（16px, 32px, 80px）：GitHub Pages上でホスティング（外部URLのリンク切れによるアドイン起動障害を防ぐため）。
  - manifest.xml：Excelにアドインを認識させる設定。
  - OBPLOT_ADDIN.xlsx：エンドユーザー向け専用テンプレートファイル（Document-bound Add-in）
  - GitHub Actions（build.yml）：自動結合とデプロイ用スクリプト。

#### 3. エンドユーザーの実行方法
ユーザー負担を最小化しセットアップを自動化。
* GAS：配布スプレッドシートのカスタムメニューから起動。
* Excel：manifest.xmlを用いたローカル共有カタログ方式による起動
1. 配布された `manifest.xml` を任意のローカルフォルダに保存する。
2. 格納フォルダのプロパティから「共有」を設定し、ネットワークパス（共有パス）を取得する。
3. Excelの「ファイル」＞「オプション」＞「トラストセンターの設定」＞「信頼済みアドイン カタログ」に取得したパスを登録し、「メニューに表示する」にチェックを入れて再起動する。
4. 「挿入」タブの「アドイン（マイ アドイン）」＞「共有フォルダ」からOBPLOTを選択して起動する。

## 4. 設計思想（フロントエンドロジックの共有）
SPAアーキテクチャ維持と環境差異の動的吸収。
  - UI、State、ビジネスロジックは両環境で単一コードを完全共有。
  - typeof判定等で環境を検知し、DIとAdapterで差分吸収。
  - 通信（I/O）と永続化（Storage）のインターフェースを動的切替。

#### 5. 起動実行フローとファイルホスティング（確定版）
自動ビルドと環境別インジェクションによる堅牢な稼働を実現。
* GAS環境：サーバーサイドでinclude関数を用い動的に結合し、純粋な `Sidebar.html` として稼働。
* Excel環境：GitHub Actionsにより自動ビルドされた単一の静的HTML（`App.html`）を利用。
* 配布・カタログ連携：Excel環境では `manifest.xml` をローカル共有フォルダ経由でトラストセンターへカタログ登録し、Pages上のビルド済み `App.html` を安全にロードする。
* ホスティング：ユーザーはPages上の結合済みHTMLを安全にロード。
* キャッシュ対策：Web版Excelの強力なアドインキャッシュを回避するため、manifestのSourceLocation URLに `&v=2` などのバージョンクエリを付与して強制更新させる。

> 【GitHub Actionsによる自動ビルドの詳細】  
> リポジトリ上のソースコードは綺麗な分割状態（src/配下）を維持する。  
> 開発者がコードをPushすると、GitHub Actions（`build.yml`）および `infra/build.js` により、ビルド時にExcel必須の公式 `office.js` を自動インジェクションした単一の静的HTML（`App.html`）が生成される。  
> これにより、CSP（セキュリティポリシー）違反やDOM Based XSSのリスクを完全に回避し、エンドユーザーには常に安全で高速な単一ファイルを提供する。

## 6. 重要な技術要件
各環境での安全確保と独立分析環境を実現する。
  - シート初期化：起動時に分類別（生/アプリ）に存在確認と自動作成。
  - 初期化ロック：生データシート新規作成時はステータス警告し処理ロック。
  - 独立型レポート：データとロジックを内包し単独動作するBlobを生成。動的な文字列置換のリスクを排除し純粋なHTMLファイルとして展開する。
  - 永続化：Excel設定へメタデータ保存しファイル共有で状態復元。
  - サンドボックス回避：Web版Excelの制限でダイアログ等のネイティブAPI（`showModal`）がブロックされる環境を考慮し、純粋なCSSクラス（`.dialog-fallback`）による強制表示フォールバックを組み込む。

> 【自己完結型HTMLによるレポート出力とState動的コピー】  
> ブラウザ制限回避のため、GAS環境はBlob URLをwindow.openで別タブ展開、Excel環境は<a>タグでローカルへダウンロード保存させる。  
> レポート側で静的UI（ボタン確定）による分析操作（シンボル変更、多項式等）を可能にするため、ハードコードを避け、本体のState機構を動的コピーして注入する。
> 
> ```
> // 自己完結型HTMLによるレポート出力とState動的コピー（実装コード例）
> 
> // 出力処理時：本体のクラス定義を文字列化してテンプレートへ動的注入
> const reportHtml = templateHtml
>   .replace('/*{{INJECT_APPSTATE}}*/', AppState.toString())
>   .replace('/*{{INJECT_OB_CAL_PLOT}}*/', ObCalPlot.toString())
>   .replace('/*{{INJECT_EXTRACTED_DATA}}*/', JSON.stringify(extractedData));
> 
> // レポート側の初期化：注入されたクラスを用いて軽量なStateを再構築
> const ReportState = new AppState();
> ReportState.reset({
>   data: /*{{INJECT_EXTRACTED_DATA}}*/,
>   refs: { targetItems: [], polyDegree: 1, symbRls: [] }, // UI操作用
>   status: []
> });
> ```
