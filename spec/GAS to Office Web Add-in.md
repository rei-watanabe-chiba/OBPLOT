# GAS to Office Web Add-in 実装要件定義書

## 1. 実行環境
同一フロントエンドで2環境稼働を実現する。
  - GAS環境：V8 Runtime / HtmlServiceを利用。
  - Excel環境：Office Web Add-inを利用。

## 2. 開発者が用意するもの
配布・実行環境とアドイン設定を整備する。
  - GitHub公開リポジトリ：ソースの一元管理とPages公開。
  - manifest.xml：Excelにアドインを認識させる設定。
  - OBPLOT_ADDIN.xlsx：エンドユーザー向け専用テンプレートファイル（Document-bound Add-in）
  - GitHub Actions（build.yml）：自動結合とデプロイ用スクリプト。

## 3. エンドユーザーの実行方法
ユーザー負担を最小化しセットアップを自動化。
  - GAS：配布スプレッドシートのカスタムメニューから起動。
  - Excel：配布OBPLOT_ADDIN.xlsxをダウンロードして起動

## 4. 設計思想（フロントエンドロジックの共有）
SPAアーキテクチャ維持と環境差異の動的吸収。
  - UI、State、ビジネスロジックは両環境で単一コードを完全共有。
  - typeof判定等で環境を検知し、DIとAdapterで差分吸収。
  - 通信（I/O）と永続化（Storage）のインターフェースを動的切替。

## 5. 起動実行フローとファイルホスティング
アプローチA（自動ビルド）でセキュリティリスクを排除。
  - GAS：サーバーサイドでinclude関数を用い動的に結合。
  - Excel：GitHub Actionsで各HTMLを事前結合し1枚の静的HTMLを生成。
  - Excel：ユーザーはPages上の結合済みHTML（App.html等）を安全にロード。

> 【アプローチA（GitHub Actionsによる自動ビルド）の詳細】  
> リポジトリ上のソースコードは綺麗な分割状態（src/配下）を維持する。開発者がコードをPushすると、GitHub Actionsが自動的に `src/` 配下のファイルを1枚のHTMLに結合（ビルド）し、GitHub Pagesへデプロイする。  
> これにより、CSP（セキュリティポリシー）違反やDOM Based XSSのリスクを完全に回避し、エンドユーザーには常に安全で高速な単一ファイルを提供する。


## 6. 重要な技術要件
各環境での安全確保と独立分析環境を実現する。
  - シート初期化：起動時に分類別（生/アプリ）に存在確認と自動作成。
  - 初期化ロック：生データシート新規作成時はステータス警告し処理ロック。
  - 独立型レポート：データとロジックを内包し単独動作するBlobを生成。
  - 永続化：Excel設定へメタデータ保存しファイル共有で状態復元。

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

## 7. 現在の進捗状況
- web版エクセルにて、エンドユーザー向け専用テンプレートファイル起動確認まで到達
- 現在、表示しているWebページ（App.html）内部のレンダリングエラーが発生中
- コンソールに以下のエラーあり
App.html?et=:8 Uncaught ReferenceError: google is not defined
    at App.html?et=:8:13
(anonymous) @ App.html?et=:8
App.html?et=:613 Uncaught SyntaxError: Unexpected end of input (at App.html?et=:613:83)
App.html?et=:615 Uncaught ReferenceError: google is not defined
    at App.html?et=:615:7

