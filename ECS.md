# OBPLOT タブ2（グラフ描画・データ補正機能）設計書

## 1. Sidebar UIの設計（アコーディオン4層構造）
限られた幅（300px）を有効活用するため、`<details>`を用いたアコーディオンで各エリアを構成。拡張性を持たせるため、パネル内の要素はJavaScriptから動的に生成・更新する前提とする。

### ① データ設定（ConfigArea）
- **機能**: 分析対象のdatasetを絞り込み
- **UI**: 「データ読込」ボタン
- **UI**: 読み込み後、PXRFの `dataset` をリストアップした「スクロール可能なチェックボックス群」を動的生成（CSSで高さ制限＋スクロール）

### ② シンボルマッピング（SymbolMapArea）
- **機能**: グラフ上の点（マーカー）のスタイル設定
- **UI**: 基準軸選択プルダウン（`dataset`, `item`, `Group`, `Source`）
- **UI**: 選択軸のユニーク値ごとに自動生成される設定行（[値名] + [形状: `circle`, `triangle`, `square`] + [色: パレット色]）

### ③ 補正＆プレビュー（CorrectionArea）
- **機能**: 特定元素の相関確認と補正のテスト計算
- **UI**: 対象要素選択プルダウン（単一元素 ＋ 指数 を統合したリスト）。
- **UI**: 「補正を適用」チェックボックス ＋ 「プレビュー確定」ボタン
- **UI**: プレビュー用散布図（相関直線付き、幅260px程度）
- **UI**: 統計情報パネル（動的生成・表形式）。
  - 計算ロジックから渡される配列データ（相関係数、決定係数、残差標準偏差、Err値の3σ、最大残差など）をループで回し、CSS Grid等でコンパクトな表形式に自動レンダリング。
- **UI**: [既存補正値適用プルダウン] / [新規インデックス名入力欄] + 「Correction保存」ボタン。

### ④ レポート出力設定（ReportArea）
- **機能**: 複数元素の一括レポート生成
- **UI**: **レポート・スロット (1〜9行)**
  - 各行: `[対象要素選択プルダウン (③と共通)]` + `[補正適用チェックボックス]` のGrid配置。
- **UI**: 「レポート表示」ボタン（別タブに生成）

---

## 2. コード設計（MVC + Method 分離）
将来的な統計項目の変更や追加に耐えられるよう、計算ロジックを独立・抽象化する。
- **列指向データモデル (Columnar Data Model) の採用**:
  - 行指向（`[[id, Fe, Mn...], [id, Fe, Mn...]]`）の元データを、列指向（`{ Fe: [1,2,3], Mn: [4,5,6] }`）へ変換して保持します。
  - **目的**: 特定要素の相関計算や、配列同士の四則演算（指数の計算）のコード量が削減。Google Visualization API 用のDataTable生成。
- **安全な動的式評価 (Safe Expression Parser)**:
  - 指数文字列（例: `"ob_Mn * 100 / ob_Fe"`）を計算する際、`eval` は使わず、`new Function()` を用いて使用可能な変数スコープを制限し、高速かつ安全に配列データを処理するコンパイラ関数をMethod層に実装します。

### 【State (Model) - `Tab2ST` 拡張】
- **phase**: アプリの進行状態（初期[1] -> 読込済[2]...）
- **rawData**: { pxrf, wdxrf, correction } の各シート生データ
- **mergedData**: dataset + ID で結合済みのベースデータ
- **statsCache**: 各元素の事前計算結果。構造: `{ element: { metrics: [{label, value}], slope, intercept } }`
- **filter**: { datasets: [] } （①の選択状態）
- **symbol**: { baseKey: "dataset", mapping: {} } （②のマッピング状態）
- **preview**: { element: "", isCorrected: false } （③のプレビュー状態）
- **report**: { elements: [], applyCorrection: false } （④の出力状態）

### 【Method (純粋ロジック)】
- **DataMerger**: PXRFとWDXRFを `dataset + "_" + ID` をキーとしてInner Join。
- **StatsCalculator**:
  - ベース計算: 傾き(a)、切片(b)の算出。
  - 残差・誤差計算: 各プロットの残差計算、最大残差の特定、残差標準偏差の算出、およびErr値配列からの3σ算出。
  - 出力フォーマッタ: UI表示用の中間フォーマット（`[{label: "R²", value: 0.98}, ...]`）に整形。項目追加時はこのクラスのみ改修する。
- **CorrectionEngine**: 対象データと `statsCache` （またはシート補正値）を受け取り、数値を補正（非数値はそのまま）。
- **CorrectionValidator**: 補正インデックス名の重複検査および保存用データ配列の整形（未計測元素は空欄処理）。
- **ChartConfigBuilder**: Google Visualization API 用のデータテーブルとオプション（トレンドライン等）の動的生成。

### 【Controller / View】
- **Controller**:
  - データ取得 -> `DataMerger` -> `StatsCalculator` で事前計算 -> Stateへ保存の流れを制御。
  - プレビュー更新やCorrectionシートへの保存アクションをハンドリング。
- **View (UIStateUpdater)**:
  - Stateの `statsCache` や `mapping` などの変更を検知し、チェックボックス、マッピング設定行、統計情報パネルなどのHTMLを動的（テンプレートリテラル＋map等）に再構築して表示。
