# SYSTEM DIRECTIVE: STRICT NAMING CONVENTION MASTER

## 1. GLOBAL SCOPE (Module Interoperability & Namespace)
**[Objective]** Maintain class hierarchies and modularity. Allow verb duplication across different namespaces (e.g., `T1Ctrl.load` and `T2Ctrl.load`) while keeping property/method names highly concise and domain-specific.
**[Format]** `Namespace` . `Verb (Max 5 chars)` + `Domain Noun`

### 1-1. Reserved Namespaces (Strictly Enforced)
- `GLB`: Global constants and app states.
- `T1` / `T2`: Pure functions and Event routing logic for Tab1/Tab2.
- `T1Ctrl` / `T2Ctrl` / `CoreCtrl`: Controller layer functions.
- `Mtd`: Method layer (Domain logic & Math).
- `Evt`: Event routing layer.
- `UI`: View and DOM manipulation layer.
- `API`: External GasService communication.

### 1-2. Allowed Verbs (Do NOT use 'get' or 'set' to avoid DOM conflicts)
- `load` (Load/Acquire inner data)
- `fetch` (Fetch external API data)
- `build` (Construct objects/arrays)
- `gen` (Generate rows/DOM elements)
- `renew` (Update states/UI phases)
- `run` (Execute pipeline/process)
- `calc` (Mathematical calculations)
- `check` (Validation/Duplication check)
- `vald` (Format/Rule validation)
- `tgl` (Toggle UI/States)

### 1-3. Reserved Domain Nouns
**[Data Sources & Managers]**
- `pxrf` / `wdxrf`: Reserved strictly for data originating from the respective sheets.
- `DB`: Universal abbreviation for dataset/dataBase/dset.
- `mgmtDT`: DataManager equivalent.
- `mgmPrev`: PreviewManager equivalent.

**[Functional Sections]**
- `pref` (Config/Preferences)
- `raw` (Raw file data)
- `extr` (Extracted data)
- `asgn` (Assigned DB data)
- `symb` (Symbol config)
- `prev` (Preview rendering)
- `repo` (Report generation)

**[General Concepts]**
- `Conf`, `Phs` (Phase), `Elm` (Element), `Lgc` (Logic), `Opt` (Option), `Vald` (Validator), `Calc`, `List`, `Corr` (Correction), `Stats`.

### 1-4. DOM ID Suffixes
- Use strictly: `Sec` (Section), `Box` (Box - kept as is), `Btn` (Button), `Area` (Area - kept as is), `Bar` (StatusBar).

---

## 2. LOCAL SCOPE: Extreme Compression (Consonant Extraction)
**[Objective]** Prevent catastrophic conflicts with external libraries (e.g., ECharts) and DOM properties by shrinking local variables, loop counters, and arguments inside methods.
**[Rule]** Remove vowels to create the shortest identifiable consonant clusters. NEVER use `shape`, `color`, `value`, or `option` as variable names.

### Reserved Local Abbreviations:
- **Values/Indexes**: `v` (micro scope), `val` (normal scope), `idx` (index).
- **DOM/Structure**: `cntr` (container), `cnt` (content), `hdr` (header), `sum` (summary).
- **Styling/Config**: `shp` (shape), `clr` (color), `opt` / `opts` (option/s), `rl` / `rls` (rule/s), `pfx` (prefix).
- **Execution**: `elm` (element), `res` (result), `mch` (match), `fml` (formula), `itv` (interval), `cur` (current).

---

## 3. LOCAL SCOPE: Data Entity Identifiers
**[Objective]** Visually distinguish core business logic data structures (arrays, objects) from temporary variables or flags.
**[Rule]** Suffix domain abbreviations with `DT` (Data Table/Type).

### Standard Implementations:
- Use for primary datasets: e.g., `statsDT`, `prevDT`, `plotDT`, `corrDT`, `pxrfDT`, `wdxrfDT`, `shtDT`.
- **[STRICT EXCEPTIONS]**: Must use `wrapPXRF` (for merged PXRF data) and `wrapWDXRF` (for WDXRF Object arrays). Do not use `DT` for these two.
- **[MAINTAINED]**: Keep `fileDT` and `rawDT` as is.

---

## 4. LOCAL SCOPE: State and Flag Identifiers
**[Objective]** Clarify the intent of boolean conditional branches.
**[Rule]** Use exact prefixes (`is`, `has`, `use`) combined with short nouns or adjectives.

### Prefix Guidelines & Reserved Flags:
- **`is` (State/Property)**: `isListMod` (File list edited/modified), `isDis` (Disabled), `isShow` (Visible), `isOpen`, `isCheck`, `isDup`, `isAllPos`.
- **`has` (Possession/Inclusion)**: `hasRefErr` (Contains reference errors), `hasEmpty`, `hasClr` (Has color definition).
- **`use` (Feature Toggle)**: `useLOD` (LOD replacement active), `useCal` (Calibration applied).

---

## 5. EXCEPTIONS & EXEMPTIONS
**[Math & Iterators]**
- Keep math standard variables exactly as they are: `x`, `y`, `m`, `b`, `n`, `r`, `r2`.
- Keep regression terms: `slope`, `intercept`.
- Keep chart rendering terms: `niceMin`, `niceMax`, `niceTicks`.
- Keep 1-char standard iterators in micro-scopes: `r` (row), `d` (data), `p` (point), `e` (event), `err` (error).
- Domain specific element shortcuts: `ob` (obsidian), `md` (mudrock).

***

# システム・ディレクティブ：厳格な命名規則マスタ

## 1. グローバル空間（モジュール間連携と名前空間）
**【目的】** クラス階層やモジュール性を維持する。異なる名前空間（例：`T1Ctrl.load` と `T2Ctrl.load`）間での動詞の重複を許容しつつ、プロパティやメソッド名を極めて簡潔かつドメイン固有に保つ。
**【書式】** `名前空間(2〜6文字)` + `動詞(最大5文字)` + `ドメイン名詞`

### 1-1. 予約済み名前空間（厳格に適用）
- `GLB`: グローバル定数とアプリケーション状態。
- `T1` / `T2`: Tab1/Tab2の純粋関数およびEventルーティングロジック。
- `T1Ctrl` / `T2Ctrl` / `CoreCtrl`: Controller層の関数。
- `Mtd`: Method層（ドメインロジック・計算）。
- `Evt`: Eventルーティング層。
- `UI`: ViewおよびDOM操作層。
- `API`: 外部通信（GasService）層。

### 1-2. 許可された動詞（DOM競合を避けるため `get`/`set` は絶対に使用しない）
- `load` (内部データの読込/取得)
- `fetch` (外部APIデータの取得)
- `build` (オブジェクト/配列の構築)
- `gen` (行/DOM要素の生成)
- `renew` (状態/UIフェーズの更新)
- `run` (パイプライン/処理の実行)
- `calc` (数学的計算)
- `check` (検証/重複チェック)
- `vald` (フォーマット/ルールの検証)
- `tgl` (UI/状態の切替・トグル)

### 1-3. 予約済みドメイン名詞
**[データソース・マネージャー系]**
- `pxrf` / `wdxrf`: 各シートに由来するデータ専用の予約語。
- `DB`: dataset / dataBase / dset を統合した汎用略語。
- `mgmtDT`: DataManager に相当。
- `mgmPrev`: PreviewManager に相当。

**[機能セクション系]**
- `pref` (設定/Config)
- `raw` (読込ファイル生データ)
- `extr` (抽出データ)
- `asgn` (割当済みDBデータ/Assign)
- `symb` (シンボル設定)
- `prev` (プレビュー描画)
- `repo` (レポート生成)

**[汎用概念]**
- `Conf`, `Phs` (フェーズ), `Elm` (元素), `Lgc` (論理式), `Opt` (選択肢), `Vald` (バリデーター), `Calc`, `List`, `Corr` (補正), `Stats`.

### 1-4. UI / DOM ID 接尾辞
- 厳密に以下を使用する：`Sec` (セクション), `Box` (ボックス: 維持), `Btn` (ボタン), `Area` (エリア: 維持), `Bar` (ステータスバー).

---

## 2. ローカル空間：高強度圧縮（子音抽出法）
**【目的】** 外部ライブラリ（ECharts等）やDOM属性との破壊的な競合を防ぐため、メソッド内のローカル変数、ループカウンタ、引数を限定スコープ内で極限まで短縮しコード密度を最大化する。
**【ルール】** 母音を排除し、文脈から識別可能な最小の子音クラスタを作成する。変数名として `shape`, `color`, `value`, `option` は絶対に使用しないこと。

### 予約済みのローカル略語：
- **値 / インデックス**: `v` (極小スコープ), `val` (通常スコープ), `idx` (インデックス).
- **DOM / 構造**: `cntr` (コンテナ), `cnt` (コンテンツ), `hdr` (ヘッダー), `sum` (サマリー).
- **スタイル / 設定**: `shp` (形状), `clr` (色), `opt` / `opts` (選択肢), `rl` / `rls` (ルール), `pfx` (接頭辞).
- **実行・その他**: `elm` (要素), `res` (結果), `mch` (マッチ), `fml` (数式), `itv` (インターバル), `cur` (現在値).

---

## 3. ローカル空間：データ実体の識別子
**【目的】** 一時変数やフラグと明確に区別し、コアビジネスロジックのデータ構造（配列、オブジェクト等）であることを視覚的に明示する。
**【ルール】** ドメイン略語の末尾に `DT` (Data Table / Data Type) を付与する。

### 標準実装と例外：
- **標準データセット**: `statsDT`, `prevDT`, `plotDT`, `corrDT`, `pxrfDT`, `wdxrfDT`, `shtDT`.
- **[厳格な例外]**: マージ済みPXRFデータには必ず `wrapPXRF` を、WDXRFオブジェクト配列には `wrapWDXRF` を使用する。これらに `DT` は付与しない。
- **[維持]**: `fileDT` および `rawDT` はそのまま維持する。

---

## 4. ローカル空間：状態・フラグの識別子
**【目的】** boolean型の条件分岐の意図（状態、所持、機能の有効化）を直感的にする。
**【ルール】** 短いプレフィックス（`is`, `has`, `use`）と名詞/形容詞を組み合わせる。

### プレフィックスと予約済みフラグ：
- **`is` (状態・性質)**: `isListMod` (ファイルリスト編集済), `isDis` (無効化), `isShow` (表示), `isOpen`, `isCheck`, `isDup`, `isAllPos`.
- **`has` (所有・内包)**: `hasRefErr` (参照エラーを含む), `hasEmpty`, `hasClr` (色定義を持つ).
- **`use` (機能トグル・有効化)**: `useLOD` (LOD置換を適用), `useCal` (検量線を適用).

---

## 5. 例外および適用除外（補足ルール）
**[数学的変数・イテレータ]**
- 数学の標準変数はそのまま維持する：`x`, `y`, `m`, `b`, `n`, `r`, `r2`.
- 回帰分析の用語は維持する：`slope`, `intercept`.
- チャート描画の計算用語は維持する：`niceMin`, `niceMax`, `niceTicks`.
- 極小スコープにおける1文字の標準イテレータは維持する：`r` (row), `d` (data), `p` (point), `e` (event), `err` (error).
- ドメイン固有の要素省略形：`ob` (obsidian), `md` (mudrock).
