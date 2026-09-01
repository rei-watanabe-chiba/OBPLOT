# ROADMAP.md: OBPLOT1.0 Legacy Eradication & Optimization

## 1. パラダイムシフトとレガシー駆逐の判断基準

システム全体が「完全スキーマ駆動・単方向データフロー」へ進化したことに伴い、設計思想に合致しない旧アーキテクチャ（レガシーコード）を特定し、安全に駆逐するための判断基準（Before / After）を定義する。

### 1.1 DOM操作とUI同期のパラダイムシフト
* **【Legacy (Before)】命令的・直接的DOM操作:**
  * `document.getElementById('...').opts = ...` のような直接代入。
  * `replaceChildren()` によるDOMツリーの破壊的更新。
  * 各Action内での手動によるステータスバー操作（`State.set(..., ["loading", ...])`の散在）。
* **【Modern (After)】宣言的UIとPatch型同期への完全委譲:**
  * DOM操作はすべて `SCHEMA` のフェーズ定義（`activePhase`, `disablePhase`等）と、カスタム属性（`data-bind-opts`, `data-bind-src`, `data-bind-fields`等）によるバインディングに委譲する[cite: 26]。
  * **[Why]**: DOMの直接操作はWeb Componentsの参照ロスト（UI凍結）を生む。単方向データフロー（State → UI）の原則を破る命令的処理は、UIの不整合と保守性低下の温床となるため、一掃する必要がある。

### 1.2 制御フローと状態管理のパラダイムシフト
* **【Legacy (Before)】個別実装された制御フロー:**
  * 各非同期アクション内に記述された `if (!await NewDOM.confirm(...)) return;` によるガード節と、後続の `withAsyncLock` 呼び出しの二段構え。
  * UI表示のためだけにAction層で生データを加工し、そのままDOMへ渡す処理。
* **【Modern (After)】統合パイプラインと派生状態（Derived State）:**
  * 確認〜ロック〜実行〜復元の定型フローは `CoreAction.confirmAndExecute` に完全カプセル化する[cite: 26]。
  * 生データから生成されるUI用データ（選択肢リストやコンポーネント設定）は、派生状態として `State` の別パスに保存し、自動同期させる。
  * **[Why]**: 制御ロジックの散在はUndo漏れやステータス不整合を引き起こす。Action層から制御構文を排除し、純粋なビジネスロジックのみを記述できる構造を維持するため。

### 1.3 依存関係とモジュール結合のパラダイムシフト
* **【Legacy (Before)】ドメイン密結合:**
  * コア層がTab1/Tab2などの特定ドメインの知識やステータスパスを直接参照していた。
  * 旧名前空間（`Mtd.Util`など）への依存。
* **【Modern (After)】DI（依存性の注入）と完全抽象化:**
  * ツール側から `CoreAction.configResolver` を通じて初期化情報（スキーマキーや監視パス）を注入する[cite: 26]。
  * 汎用計算は `CoreMethod` に完全集約。
  * **[Why]**: コアエンジン（A）を将来的に独立したGASライブラリとして配布するためには、コア内部から特化ツール（B/C）固有の知識を完全に排除しなければならないため[cite: 26]。

---

## 2. 最適化・クリーンアップ ロードマップ

安定動作を確認した現行システムから、不要な残骸を安全に削ぎ落とし、ライブラリ化に向けた最終最適化を行う。

### Phase 1: レガシーDOM APIと旧制御構文の走査・駆逐 【Next】
* **タスク**:
  1. 全HTMLファイルを走査し、`getElementById` や `querySelector` を用いた直接的なプロパティ代入（`innerHTML`, `opts`, `src`等）が残留していないか確認し、すべて `data-bind-*` に置き換える。
  2. Action層（`T1T2_Action.html`, `T3_Action.html`）を走査し、旧式の `NewDOM.confirm` や単独の `withAsyncLock`（ローディングの手動セットを含む）が残存していないか確認。すべて `confirmAndExecute` に統合する。
  3. 不要になったレガシーUIヘルパー（`Component.html` 内の古い描画メソッド等）を削除する。

### Phase 2: デッドコード・旧名前空間のパージ
* **タスク**:
  1. `Mtd.Util` などの旧名前空間への参照が、コメント内や `T1T2_Method.html`, `T3_Method.html`, `Chart.html` などに残っていないか確認・修正する。
  2. 使用されなくなった旧スキーマ定義、使用済みの旧CSSクラス、到達不能な（Dead）Actionメソッドや分岐ロジックを削除し、ファイルサイズを削減する。

### Phase 3: 状態（State）ツリーのシェイプアップと派生処理の最適化
* **タスク**:
  1. `State` オブジェクト内に、不要になった一時変数や重複するデータ（キャッシュ用プロパティなど）が残留していないか精査する。
  2. 派生状態（Derived State）を生成する処理（例: `updateDerivedState`）が、必要最小限の依存関係でのみ発火するよう（余計な再計算が走らないよう）Subscribeの登録粒度を最適化する。

### Phase 4: ビルドパイプライン分割とGASライブラリ化
* **タスク**:
  1. クリーンアップが完了したコードベースに対し、`infra/build.js` を改修し、ツールB用（Tracer）とツールC用（Dashboard）の静的HTMLを独立して出力・最小化（Minify）する[cite: 26]。
  2. Excelアドイン用の `manifest.xml` を分割・最適化する[cite: 26]。
  3. 汎用コア（A）を独立したGASプロジェクト（非公開ライブラリ）としてデプロイし、エンドユーザー配布用テンプレートから参照するアーキテクチャを完成させる[cite: 26]。
