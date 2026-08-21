# OBPLOT Tab2 グラフ描画・データ補正機能 設計書 (Ver. 1.2)

## 1. UI設計（アコーディオン4層構造）
- 限られた幅（300px）に対応するため、`<details>`を用いたアコーディオン4階層（section）構造を採用。
- UI要素は `AppState (Tab2ST)` および `phase` (1:INIT 〜 5:PREVIEWED) によって駆動し、宣言的ルールエンジン (`UIPhase`) で制御する。
- 静的要素（ボタン等）と動的要素（Popoverマルチセレクト、ドロップダウン等）を明確に分離する。

---

## 2. アーキテクチャ・コード設計 (MVMS パターン)
- **単方向データフロー**: UI操作 -> Evt -> Ctrl -> Method/API -> AppState (set/reset) -> UIStateUpdater -> DOM描画
- **計算ロジックの完全分離**: 計算・加工・バリデーション (`Method.html`) は DOM や GAS 通信に依存しない純粋関数・クラスとしてカプセル化。
- **安全な動的式評価 (`CalcProcessor.evaluate`)**: `new Function()` を用い、有効な `Math` 関数および変数スコープを制限して元素計算・指数評価を実施。
- **階層化State管理とフェーズ後退初期化**: 
  - `AppState` にてセクション単位 (`dataset`, `symbol`, `preview`, `report`) で状態管理。
  - 後続フェーズへの影響を防ぐため、`State.reset()` による一括初期化（フェイルセーフ）を徹底。

---

## 3. 各セクションの仕様と State 構造

### ① データ設定 (`datasetSection`)
- **機能**: 分析対象 dataset の読み込みおよび絞り込み
- **UI要素**:
  - `datasetLoadBtn` (静的): `Tab2.loadData` を実行。PXRF / WDXRF / Correction シートを取得し、`mergedPXRF`, `wdxrfObjs`, `datasets` を構築。`Tab2ST.phase = LOADED(2)`
  - `datasetFilterBtn` (静的): `Tab2.filterData` を実行。選択された dataset で絞り込んだ `basePXRF`, `baseWDXRF` を生成。`Tab2ST.phase = FILTERED(3)`
  - `datasetBox` (**動的**): Popover API を用いた疑似ドロップダウンマルチセレクト (`multiSelectDropdown`)。
    - **駆動State**: `Tab2ST.dataset.filter` (デフォルト: 全選択)

### ② シンボルマッピング (`symbolSection`)
- **機能**: グラフ上のマーカースタイル（形状・色）設定
- **UI要素**:
  - `symbolAxisBox` (**動的**): 分類軸プルダウン (`dataset`, `item`, `Group`, `Source`)。
    - **駆動State**: `Tab2ST.symbol.baseKey` (変更時に `symbolBox` を動的再生成)
  - `symbolBox` (**動的**): `baseKey` のユニーク値に応じた `[ターゲット] + [形状] + [色]` の設定行。
    - **駆動State**: `Tab2ST.symbol.mapping`
  - `symbolBtn` (静的): `Tab2.setSymbolMap` を実行。未選択項目が含まれていても通過可能とし、`Tab2ST.phase = MAPPED(4)` へ遷移。

### ③ 補正＆プレビュー (`previewSection`)
- **機能**: 特定元素・指数の計算、相関算出、統計表の表示
- **UI要素**:
  - `previewModeBox` (**動的**): Obsidianモード計測元素 (`optionalElements`) の Popover 形式マルチセレクト。
    - **駆動State**: `Tab2ST.preview.modeMap`
  - `previewItemBox` (**動的**): プレビュー対象Item (`itemMap`) の Popover 形式マルチセレクト。選択されたItemでプレビューデータ (`basePXRF`) をフィルタリングする。
    - **駆動State**: `Tab2ST.preview.itemMap`
  - `previewCorrectionBox` (**動的**): 補正方法選択 (`rawdata`: 補正なし, `new`: 新規検量線)。
    - **駆動State**: `Tab2ST.preview.correction`
  - `previewValueBox` (**動的**): 計算対象選択プルダウン (`GLOBAL_CONFIG.valueLogic`)。
    - **駆動State**: `Tab2ST.preview.value` (初期値: `GLOBAL_CONFIG.valueLogic[0]` = `"K"`)
  - `previewMakeBtn` (静的): `Tab2.makePreview` を実行。`PreviewManager.buildPreviewData` でペアデータを構築し、`CalcProcessor.calcRegression` で単回帰分析を実施。`Tab2ST.phase = PREVIEWED(5)`
  - `previewChartBox` (**動的**): カスタム要素 `<ob-cal-plot>` を配備し散布図を描画。View層からプロットデータ・統計データ・シンボル設定が DIされ、DataRoles (`style`) によって動的にスタイルが適用される（指定外・未指定時は黒線丸をデフォルト適用）。回帰式やR²値はネイティブの凡例(Legend)として表示。
  - `previewStatsTable` (**動的**): `NewDOM.statsTable` により、データ個数・R/R²・回帰直線・残差標準偏差・器械Err3σ を Grid 表形式で表示。
  - **未実装（今後実装）**: `previewItemBox` (item選択), `previewPlot` (散布図描画), `previewSave` (Correctionシートへの書き出し)

### ④ レポート出力 (`reportSection`)
- **機能**: PDF用レポート展開および複数指標の一括出力
- **UI要素**:
  - `reportOpenBtn` (静的): `Tab2.openReport` を実行し、`Report.html` を Blob URL で別タブ表示。
  - **未実装（今後実装）**: レポート内グラフ・データ適用機能の構築

---

## 4. AppState 構造 (`AppState.Tab2ST`)

```javascript
Tab2ST: {
  phase: TAB2_PHASE.INIT, // 1:INIT, 2:LOADED, 3:FILTERED, 4:MAPPED, 5:PREVIEWED
  dataset: {
    rawData: { correction: [], mergedPXRF: null, wdxrfObjs: null },
    availableDatasets: [],
    filter: [],
    basePXRF: null,
    baseWDXRF: null,
    status: []
  },
  symbol: {
    baseKey: "dataset",
    mapping: {}, // { [targetValue]: { shape: string, color: string } }
    status: []
  },
  preview: {
    modeMap: [], // optionalElements の選択配列
    value: GLOBAL_CONFIG.valueLogic[0], // "K"
    correction: "rawdata",
    correctionLogic: {}, // { slope, intercept, r, r2, ... }
    previewData: null, // [{ x, y, err }]
    statsData: null,
    status: []
  },
  report: {
    values: [],
    corrections: [],
    status: []
  }
}
