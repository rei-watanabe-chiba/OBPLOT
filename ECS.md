# for gemini

# OBPLOT Tab2 グラフ描画・データ補正機能）設計書

## 1. Sidebar UIの設計（アコーディオン4層構造）
- 限られた幅（300px）を有効活用するため、`<details>`を用いたアコーディオン4階層（section）を採用する。
- UI要素は **`AppState (Tab2ST)` および `phase`** によって駆動され、静的要素（HTMLハードコード）と動的要素（動的生成・リアクティブ要素）を明確に分離する。
- datasetSectionのdatasetFilterBtnでphaseを強制ダウングレードして内部データを初期化する。**ただし、初期化機能は全てのsection実装後に導入する。**

### 1.データ設定（`datasetSection`）
* **機能**: 分析対象のdataset絞り込み
* **UI要素**:
* `datasetLoadBtn` (静的): 「読込」ボタン。実行時に `Tab2ST.rawData`（pxrf, wdxrf, correction）を格納。
* `datasetFilterBtn` (静的): 「確定/更新」ボタン。`Tab2ST.phase` が `LOADED` 以上で有効。
* `datasetBox` (**動的**): 読込完了後にPXRFの `dataset` をリストアップしたチェックボックス群を動的生成。
* 駆動State: 出力先は `Tab2ST.filter.datasets`。変更時は `data-change` でStateに同期。
* 初期状態: すべて選択状態（配列の全要素が格納された状態）で初期化。

### 2.シンボルマッピング（`symbolSection`）
* **機能**: グラフ上の点（マーカー）のスタイル設定
* **UI要素**:
* `symbolAxis` (**動的**): マーカ分類軸選択プルダウン（`dataset`, `item`, `Group`, `Source`）。
* 駆動State: `Tab2ST.symbol.baseKey` にバインド。値変更時にsymbolBoxの行を動的再生成。
* `symbolBox` (**動的**): 設定行（`[値名プルダウン] + [形状セレクト] + [色セレクト]`）。
* 駆動State: `baseKey` のユニーク値を動的生成し選択肢に格納。変更結果は `Tab2ST.symbol.mapping` に即時同期。
* `symbolBtn` (静的): 「シンボル確定」ボタン。`Tab2ST.phase` が `FILTERED` 以上で有効。


### ③ 補正＆プレビュー（CorrectionArea）
- **機能**: 特定元素・指数の相関確認と補正適用・出力
- **UI**: [モード切替]: Mn, Fe, Rb, Sr, Y, Zr, Nbのラベルを持つラジオボタンで"obsidian"/"mudrock"を切り替え
  - (例) label ○ obsidian ○ mudrock
  - `Tab2ST.modeMap`に反映
- **UI**: [対象]: `GLB.valueLogic`から選択プルダウン
  - ボタン押下で`Tab2ST.preview`に反映
- **UI**: [補正値]: 「"補正なし", "現在の補正値", Correctionシートのインデックス名マップ」をプルダウン選択(phase開始時に生成）
  - `Tab2ST.rawData`の`correction`がnullの場合は選択肢を"補正なし", "現在の補正値"に規定
  - ボタン押下で選択に応じて各元素の補正係数計算して`Tab2ST.correctionLogic`に反映（補正なしなら1、現在の補正値な計算値、インデックス名なら`Correction`から参照）
- **UI**: [プレビュー更新]ボタン
  - 更新押下で３つのstateを反映更新。`Tab2ST.baseData`を`Tab2ST.modeMap`でソートして`Tab2ST.selectData`に代入。`Tab2ST.preview`を参照して`Tab2ST.selectData`に`Tab2ST.correctionLogic`を適用。valueが指数ならば動的計算して作図（値データはプレビュー用のみの一時データ扱い）。
- **UI**: プレビュー用散布図（相関直線付き、幅260px程度）
- **UI**: 統計情報パネル（動的生成・表形式）。
  - 計算ロジックから渡される配列データ（相関係数、決定係数、傾き、切片、残差標準偏差、Err値の3σ、最大残差）をループで回し、CSS Grid等でコンパクトな表形式に自動レンダリング。`Tab2ST.correctionLogic`に全元素の補正係数をマッピング。
- **UI**: [新規インデックス名入力欄] + 「Correction保存」ボタン
  - `Tab2ST.selectData`の各元素の補正係数を「新規インデックス名」で「Correction」シートに書き出し（書き出し時は`pushExacData()`の上書き判定ロジックに準拠）


### ④ レポート出力設定（ReportArea）
- **機能**: 複数元素の一括レポート生成
- **UI**: **レポート・スロット (1〜9行)**
  - 各行: `[対象選択プルダウン (`GLB.valueLogic`)]のGrid配置。
  - `Tab2ST.selectData`の
- **UI**: 「レポート表示」ボタン（`Tab2ST.report`にマッピングして、別タブに生成）
  - 元データ: `Tab2ST.selectData`
  - 表示グラフ: `Tab2ST.report`のvalues
  - 補正値: `Tab2ST.correctionLogic`
  - 補正元素: `Tab2ST.report`のCorrections
  - 上記を全て適用して`GLB.valueLogic`の全ての値を列インデックスとしてselectDataを計算・適用した`Tab2ST.finalData`を生成

---

## 2. コード設計（MVC + Method 分離）
将来的な統計項目の変更や追加に耐えられるよう、計算ロジックを独立・抽象化する。
- **列指向データモデル (Columnar Data Model) の採用**:
  - 行指向（`[[id, Fe, Mn...], [id, Fe, Mn...]]`）の元データを、列指向（`{ Fe: [1,2,3], Mn: [4,5,6] }`）へ変換して保持します。
  - **目的**: 特定要素の相関計算や、配列同士の四則演算（指数の計算）のコード量が削減。Google Visualization API 用のDataTable生成。
- **安全な動的式評価 (Safe Expression Parser)**:
  - 指数文字列（例: `"Mn * 100 / Fe"`）を計算する際、`eval` は使わず、`new Function()` を用いて使用可能な変数スコープを制限し、高速かつ安全に配列データを処理するコンパイラ関数をMethod層に実装します。
- **state乱立防止とマップ利用**:
  - state乱立を避けるために、state保存データと一時データを分離。state保存データはphase間の引き渡し用として、マップとオブジェクトを活用して省state化を図る
- **関心分離と共通プロシージャ利用**:
  - 省コード化のためにUI生成・計算ロジックは共通プロシージャ化を推奨し、既存プロシージャの利用も含めてスマート化に努める。
### 【State (Model) 】
- `GLB`拡張
  - **valueLogic**: 各元素・指数の計算文字列。構造: （"Mn", "Fe", "K", "Ca", "Rb".... "Mn * 100 / Fe"`）
- `Tab2ST`拡張
  - **phase**: アプリの進行状態（初期[1] -> 読込済[2]...）
  - **rawData**: { pxrf, wdxrf, correction } の各シート生のデータ
  - **baseData**: dataset + ID でpxrf, wdxrfを結合したベースデータ
  - **selectData**: モード選択と補正計算を反映した可視化ベースデータ
  - **filter**: { datasets: [] } （①の選択状態）
  - **symbol**: { baseKey: "dataset", mapping: {} } （②のマッピング状態）
  - **modeMap** : { Mn : "", Fe : "", ....}（③の元素モード選択のマッピング状態）
  - **preview**: { value: "", Correction: "rawdata" } （③のプレビュー状態, 初期値は"補正なし":"rawdata"）
  - **correctionLogic**: 各元素の補正係数
  - **report**: { values: [], Corrections: ["Mn":true, "Fe":false, ....] } （④の出力状態マッピング）
  - **finalData**: 各元素の補正係数
