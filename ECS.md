# for gemini

# OBPLOT Tab2 グラフ描画・データ補正機能）設計書

## 1. UI設計（アコーディオン4層構造）
- 限られた幅（300px）を有効活用するため、`<details>`を用いたアコーディオン4階層（section）を採用する。
- UI要素は **`AppState (Tab2ST)` および `phase`** によって駆動され、静的要素（HTMLハードコード）と動的要素（動的生成・リアクティブ要素）を明確に分離する。
- datasetSectionのdatasetFilterBtnでphaseを強制ダウングレードして内部データを初期化する。**ただし、初期化機能は全てのsection実装後に導入する。**

## 2. コード設計（MVC + Method 分離）
- 将来的な統計項目の変更や追加に耐えられるよう、**計算ロジックを独立・抽象化**する。
- **列指向データモデル (Columnar Data Model) の採用**:
  - 行指向（`[[id, Fe, Mn...], [id, Fe, Mn...]]`）の元データを、列指向（`{ Fe: [1,2,3], Mn: [4,5,6] }`）へ変換して保持します。
  - **目的**: 特定要素の相関計算や、配列同士の四則演算（指数の計算）のコード量が削減。Google Visualization API 用のDataTable生成。
- **安全な動的式評価 (Safe Expression Parser)**:
  - 指数文字列（例: `"Mn * 100 / Fe"`）を計算する際、`eval` は使わず、`new Function()` を用いて使用可能な変数スコープを制限し、高速かつ安全に配列データを処理するコンパイラ関数をMethod層に実装します。
- **state乱立防止とマップ利用**:
  - state乱立を避けるために、state保存データと一時データを分離。state保存データはphase間の引き渡し用として、マップとオブジェクトを活用して省state化を図る
- **関心分離と共通プロシージャ利用**:
  - 省コード化のためにUI生成・計算ロジックは共通プロシージャ化を推奨し、既存プロシージャの利用も含めてスマート化に努める。

## 3. UI/state構成と処理内容
- 関数名は指定しないので15文字以内で既存の命名規則と命名空間のトーンに従って作成してください
### データ設定（`datasetSection`）
- **機能**: 分析対象のdataset絞り込み
- **UI要素**:
- `datasetLoadBtn` (静的): 「読込」ボタン。実行時に `Tab2ST.rawData`（pxrf, wdxrf, correction）を格納。
- `datasetFilterBtn` (静的): 「確定/更新」ボタン。`Tab2ST.phase` が `LOADED` 以上で有効。
- `datasetBox` (**動的**): 読込完了後にPXRFの `dataset` をリストアップしたチェックボックス群を動的生成。
  - 駆動State: 出力先は `Tab2ST.filter.datasets`。変更時は `data-change` でStateに同期。
  - 初期状態: すべて選択状態（配列の全要素が格納された状態）で初期化。

### シンボルマッピング（`symbolSection`）
- **機能**: グラフ上の点（マーカー）のスタイル設定
- **UI要素**:
- `symbolAxis` (**動的**): マーカ分類軸選択プルダウン（`dataset`, `item`, `Group`, `Source`）。
  - 駆動State: `Tab2ST.symbol.baseKey` にバインド。値変更時にsymbolBoxの行を動的再生成。
- `symbolBox` (**動的**): 設定行（`[値名プルダウン] + [形状セレクト] + [色セレクト]`）。
  - 駆動State: `baseKey` のユニーク値を動的生成し選択肢に格納。変更結果は `Tab2ST.symbol.mapping` に即時同期。
- `symbolBtn` (静的): 「シンボル確定」ボタン。`Tab2ST.phase` が `FILTERED` 以上で有効。

### 補正＆プレビュー（`previewArea`）※新規設計
- **機能**: 特定元素・指数の相関確認と補正適用・出力
- **UI要素**:
- **previewModeBox** (**動的**): ラジオボタン（`obsidian`, `mudrock）。Mn, Fe, Rb, Sr, Y, Zr, Nbの6行。(例) Mn : ○ obsidian ○ mudrock
  - 駆動State: `Tab2ST.modeMap` にバインド。値変更時にMn : "obsidian"の形で即時同期
- **previewCorrectionBox** (**動的**): 補正方法選択プルダウン（`補正なし`, `新規検量線`, `Tab2ST.rawData.Correction`のインデックス名を列挙追加）
  - `Tab2ST.rawData.correction` の有無により動的生成。有: correctionのインデクス名を選択肢に追加、無:追加なし。
  - 駆動State: `Tab2ST.preview.Correction` にバインド。即時同期。値は、`補正なし`は`rawdata`、`新規検量線`は`new`、追加選択肢は直代入
- **previewValueBox** (**動的**): `GLB.valueLogic` から選択プルダウン。
  - 駆動State: `Tab2ST.preview.value` にバインド。値変更時に即時同期
- **previewMake** (静的): 押下で実行。
  - データ確定: `Tab2ST.baseData` を`Tab2ST.modeMap` でソートして、pxrfの元素を一意（例:ob_Mn, Md_Mn → pxrf_Mn)に変更して`Tab2ST.selectData` を生成。
  - 補正計算: `Tab2ST.rawData.correction`が`new`ならば`Tab2ST.selectData`から各元素と指数の補正値を計算（計算方法:wdxrf_MnがX, pxrf_MnがYの相関）
  - 補正格納: 各元素の計算結果もしくは`Tab2ST.rawData.Correction`の補正係数を`Tab2ST.correctionLogic`に格納
  - 可視化ベースデータ作成: `Tab2ST.selectData`を`Tab2ST.correctionLogic`で補正して`Tab2ST.previewData`を計算作成
  - グラフ表示: `Tab2ST.previewData`から `Tab2ST.preview.value`に応じてwdxrfをX、pxrfをYで抽出。元素ならそのまま。指数ならばそれぞれを計算。一時データ。
* **previewPlot**: 幅260px程度の相関直線付き散布図（Google Visualization API）。previewMakeの最終一時データを受け取って描画。
* **previewStatsTable** : 計算ロジックから渡される配列データ（相関係数、決定係数、傾き、切片、残差標準偏差、Err値の3σ、最大残差）をループで回し、CSS Grid等でコンパクトな表形式に自動レンダリング。`previewPlot`と同時生成
* **previewName**(静的): 新規インデックス名入力欄（input）
* **previewSave**(静的): 保存ボタン。`Tab2ST.correctionLogic`を `Correction` シートへ書き出し。（pushExacData()の上書き判定ロジックに準拠

### レポート出力（`ReportArea`）※新規設計（既存パーツはモーダル展開テスト）
- 現状では補正＆プレビューの設計確定と実装を優先するため、**今のところは検討対象外とする**
- **機能**: 複数元素の一括レポート生成
- **UI**: **レポート・スロット (1〜9行)**
  - 各行: `[対象選択プルダウン (`GLB.valueLogic`)]のGrid配置。
- **UI**: 「レポート表示」ボタン（`Tab2ST.report`にマッピングして、別モーダルに生成）
  - 元データ: `Tab2ST.selectData`
  - 表示グラフ: `Tab2ST.report`のvalues
  - 補正値: `Tab2ST.correctionLogic`
  - 補正元素: `Tab2ST.report`のCorrections
  - 上記を全て適用して`GLB.valueLogic`の全ての値を列インデックスとしてselectDataを計算・適用した`Tab2ST.finalData`を生成

## 4. state群（Model.htmlに追加
- `GLB`拡張
  - **valueLogic**: 各元素・指数の計算文字列。構造: （"Mn", "Fe", "K", "Ca", "Rb".... "Mn * 100 / Fe"`）
- `Tab2ST`拡張
  - **phase**: アプリの進行状態（初期[1] -> 読込済[2]...）
  - **rawData**: { pxrf, wdxrf, correction } の各シート生のデータ
  - **baseData**: dataset + ID でpxrf, wdxrfを結合したベースデータ
  - **selectData**: モード選択を反映した二次ベースデータ
  - **previewData**: 補正を反映した可視化ベースデータ
  - **filter**: { datasets: [] } （datasetSectionの選択状態）
  - **symbol**: { baseKey: "dataset", mapping: {} } （symbolSectionのマッピング状態）
  - **modeMap** : { Mn : "", Fe : "", ....}（previewAreaの元素モード選択のマッピング状態）
  - **preview**: { value: "", Correction: "rawdata" } （previewAreaのプレビュー状態, 初期値は"補正なし":"rawdata"）
  - **correctionLogic**: 各元素の補正係数
  - **report**: { values: [], Corrections: ["Mn":true, "Fe":false, ....] } （ReportAreaの出力状態マッピング）
  - **finalData**: 別モーダルに引き渡すデータ
