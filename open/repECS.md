# OBPLOT1.0 Report/Dashboard 機能拡張 要件定義・設計書

## 1. システム概要とビルド・注入アーキテクチャ

レポート出力機能は、本体アプリケーションから完全に独立して稼働する単一のHTML（SPA）として実装する。

* **クラス群の静的結合（セキュア化）:** 実行時の `.toString()` による動的評価は行わず、GAS版では `include` 構文、Excel版では GitHub Actionsの `infra/build.js` によるビルドプロセスで、`Method.html` や `Model.html` などのコアロジックを `Report.html` に静的結合する。
* **データ注入方式:** 本体側（`T2Ctrl.openRepo`）の出力処理時に、生データ（`pxrfDT`, `wdxrfDT`, `corrDT`）のみを厳密にエスケープしたJSON文字列に変換し、`Report.html` 内のプレースホルダー（例: `/*{{INJECT_REPORT_DATA}}*/`）を置換して展開する。
* **数式評価の安全確保:** DOM Based XSSを防ぐため、`new Function` の使用を廃止し、セキュアな数式評価ライブラリである `math.js` をCDNから読み込んで指数計算の評価エンジンとする（文字列指定の拡張性は維持）。

## 2. State管理スキーマ (`ReportState`)

別タブ専用のステートマシンとして `ReportState` を定義し、`dash` セクションで一元管理する。補正設定はダッシュボード全体のベースデータに影響するため、パネル個別ではなくグローバルレベル（`dash.refs` 直下）で保持する。

```javascript
ReportState = {
  dash: {
    data: {
      pxrfDT: [], wdxrfDT: [], corrDT: [] // 本体から注入された生データ
    },
    refs: {
      // --- グローバル補正設定（全パネル共通） ---
      correction: "new",       // 適用する補正値セット名（Tab2から継承）
      useCal: false,           // 補正適用トグル
      calElms: [],             // 補正適用対象元素（マルチセレクト）

      // --- グリッド構成と印刷設定 ---
      gridRows: 1, // 行数（最大3）
      gridCols: 1, // 列数（最大3）
      margins: { top: 15, bottom: 15, left: 15, right: 15 }, // 余白（mm指定）
      
      // --- UI状態 ---
      activePanelId: "p_0", // 現在サイドバーで設定対象となっているパネルID
      
      // --- パネル個別設定 ---
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

## 3. UI/UXとレイアウト制御

* **A4縦コンテナ:** 右側のメイン描画領域はA4縦の比率を維持する（`aspect-ratio: 210 / 297;`）。設定された `margins` はコンテナのpaddingとして適用され、そのまま印刷余白となる。
* **可変サイズグリッド（CSS Grid）:** コンテナ内に最大3×3のグリッドを配置する。追加ボタンによって `dash.refs.gridRows` / `gridCols` を更新し、グラフサイズを自動分割（等分）させる。
* **アクティブパネル連動方式:** 右側のグラフパネルをクリックすることで `activePanelId` が更新される。左サイドバーのパネル個別設定UI（グラフタイプ、指標指定、シンボルなど）は、`panels` 配列内のアクティブな要素を双方向バインディングする。
* **PDF印刷対応:** `window.print()` 実行時、`@media print` により左サイドバーを非表示（`display: none`）とし、右側のA4コンテナのみを幅100%で出力する。

## 4. グラフ描画と分析機能 (検量線 / 判別図)

ダッシュボードのベースとなる `pxrfDT` には、サイドバーの「補正適用トグル(`useCal`)」と「補正適用元素(`calElms`)」の設定状態に応じて、動的に検量線補正ロジックが適用される。

* **検量線 (Calibration):**
X軸をWDXRF、Y軸をPXRFとして同一指標（`calibVal`）を描画し、回帰直線を引く。
* **判別図 (Discrimination):**
X軸・Y軸それぞれに任意の指標（`discrXVal`, `discrYVal`）を設定可能。WDXRFとPXRFのデータ点を同一グラフ上に散布図として描画する。
* **視覚的区別ルール:** シンボル設定（形状・色）は一元管理される。PXRFの点は設定された形状・色をそのまま反映するが、WDXRFの点は形状のみを引き継ぎ、カラーは専用の「単色（特色）」で固定描画される。



## 5. ダッシュボード状態の永続化

本体側の `MakeBU` クラスのロジックを踏襲し、`dash.refs` の内容をローカルストレージ（キー名: `OBP_DASH_BU`）へ自動保存する。ブラウザリロード時に復元することで、レイアウト構成や指標設定の作業状態を永続化する。

---
