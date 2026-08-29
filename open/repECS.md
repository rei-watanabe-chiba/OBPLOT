# OBPLOT1.0 Report/Dashboard 機能拡張 要件定義・設計書

## 1. システム概要とビルド・注入アーキテクチャ

レポート出力機能は、本体アプリケーションから完全に独立して稼働する単一のHTML（SPA）として実装する。

* **クラス群の静的結合（セキュア化）:** 実行時の `.toString()` による動的評価は行わず、GAS版では `include` 構文、Excel版では `infra/build.js` によるビルドプロセスで、`Method.html` や `Model.html` などのコアロジックを `Report.html` に静的結合する。


* **データ注入方式:** 本体側（`T2Ctrl.openRepo`）の出力処理時に、生データ（`pxrfDT`, `wdxrfDT`, `corrDT`）のみを厳密にエスケープ（`</script>` 破壊防止）したJSON文字列に変換し、`Report.html` 内のプレースホルダー（例: `/*{{INJECT_REPORT_DATA}}*/`）を置換して展開する。
* **数式評価の安全確保:** `GLB.valLgc` 等で指定される文字列ベースの指数計算におけるDOM Based XSSを防ぐため、`new Function` の使用を廃止し、セキュアな数式評価ライブラリである `math.js` をCDNから読み込んで評価エンジンとする。



## 2. State管理スキーマ (`ReportState`)

別タブ専用のステートマシンとして `ReportState` を定義し、`dash` セクションで一元管理する。

```javascript
ReportState = {
  dash: {
    data: {
      pxrfDT: [], wdxrfDT: [], corrDT: [] // 本体から注入された生データ
    },
    refs: {
      gridRows: 1, // 行数（最大3）
      gridCols: 1, // 列数（最大3）
      margins: { top: 15, bottom: 15, left: 15, right: 15 }, // 余白（mm指定、最大30）
      activePanelId: "p_0", // 選択中のパネルID
      panels: [
        { 
          id: "p_0", 
          graphType: "calibration", // "calibration" (検量線) | "discrimination" (判別図)
          calibVal: "",             // 検量線用指標 (例: "Fe")
          discrXVal: "",            // 判別図用X軸指標 (例: "Mn * 100 / Fe")
          discrYVal: "",            // 判別図用Y軸指標
          gphStyle: {/* defaultGraphStyle を初期値として保持 */}
        }
      ]
    },
    status: []
  }
};

```

* **初期状態:** 空のグラフ枠が1つ（1×1）のみ存在する状態からスタートする。

## 3. UI/UXとレイアウト制御

* **A4縦コンテナ:** 右側のメイン描画領域はA4縦の比率を維持する（`aspect-ratio: 210 / 297;`）。
* **可変サイズグリッド（CSS Grid）:** コンテナ内に最大3×3のグリッドを配置する。サイドバーの「＋」ボタンによって `dash.refs.gridRows` / `gridCols` を更新し、CSS変数（`--col-count`, `--row-count`）を通じてグラフの幅・高さを自動分割（等分）させる。
* **アクティブパネル連動方式:**
* 右側のグラフパネルを直接クリックすることで、`activePanelId` が更新される。
* 左側のサイドバー設定UIは常に1セットのみ描画され、`panels` 配列内の `activePanelId` に合致する要素を双方向バインディング（購読・更新）する。


* **PDF印刷対応:** `window.print()` 実行時、`@media print` により左サイドバーを非表示（`display: none`）とし、右側のA4コンテナのみを幅100%で出力する。設定した `margins` はコンテナのpaddingとして適用され、そのまま印刷余白となる。

## 4. グラフ描画と分析機能

サイドバー上部のセレクトボックスにて、アクティブパネルのグラフタイプを切り替える。

* **検量線 (Calibration):** X軸をWDXRF、Y軸をPXRFとして同一指標（`calibVal`）を描画し、回帰直線（`Mtd.T2.Calc.calcReg` のロジック）を引く。


* **判別図 (Discrimination):** X軸・Y軸それぞれに任意の指標（`discrXVal`, `discrYVal`）を設定可能とする。WDXRFのデータ点とPXRFのデータ点の双方を同一グラフ上に散布図として描画する（クラスター表示等は将来拡張枠とする）。

## 5. ダッシュボード状態の永続化

本体側の `MakeBU` クラスのロジックを踏襲し、`dash.refs` の内容をローカルストレージ（キー名: `OBP_DASH_BU` 等）へ保存する。リロード時に自動復元することで、作成した複数グラフのレイアウトや指標設定を保持する。
