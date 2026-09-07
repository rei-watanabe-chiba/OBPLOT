了解いたしました。これまでの実装に基づく「Form Addon仕様」の設計書を作成しました。

```markdown
# Form Addon 実装設計書

## 1. 仕様概要
`form-addon`は、`<input>`や`<select>`といったフォーム入力要素の前後に対して、アイコンやテキスト（単位など）を付与するための共通UIモジュールです。
保守性とDRY原則を高めるため、HTML側にカスタムデータ属性（`data-addon-*`）として見た目の定義を記述し、JavaScript（バインダーおよびテンプレート）がそれを解釈して適切なDOM構造を自動構築します。

## 2. バインドフロー（データフロー）
動的に生成されるフォーム要素に対して、以下の順序で情報が伝播し、DOMが構築されます。

1. **HTML定義 (`Report.html`)**
   バインド対象の親コンテナに `data-addon-icon` などの属性を直書きし、UIの装飾内容を宣言します。
2. **属性抽出とマージ (`CoreUI.html`)**
   `data-bind-fields` のバインダー処理実行時、親コンテナの `dataset` からアドオン設定を抽出し、生成用オブジェクト（`optFields` 等の各要素）の `addon` プロパティとしてマージします。
3. **HTML文字列の構築 (`Component.html`)**
   `Tpl.Form` クラスがマージされた `addon` オブジェクトを受け取り、指定内容に応じて `<div class="form-addon">` と前後のコンテナを含むHTML文字列を出力します。

## 3. 関連モジュールと関数仕様

### A. `CoreUI.html` (バインダー)
* **`bindDefs` 内の `bindFields` 処理**
  * **役割**: `data-bind-fields` を持つ要素の処理時に、自身に付与された `data-addon-*` 属性を読み取ります。有効な設定があれば、バインド対象のデータ配列に `addon` オブジェクトを追加します。
  * **プロパティ名**: 
    * `data-addon-icon`: 先頭アイコン名 (例: `text_format`)
    * `data-addon-prefix`: 先頭テキスト
    * `data-addon-suffix`: 末尾テキスト (単位など)
    * `data-addon-color`: 色指定 (例: `var(--theme-color)`)
* **`CoreUIPatcher.bindFormAddons(nameList, fontSize, color, configObj)`**
  * **役割**: 動的生成（`data-bind-fields`）ではなく、HTMLに静的に記述された入力要素に対してアドオン構造を事後付与するユーティリティ関数です。（余白設定などに使用）

### B. `Component.html` (テンプレート)
* **`Tpl.Form.input(conf)` / `Tpl.Form.select(conf)`**
  * **役割**: コントロール本体のHTMLを生成した後、引数 `conf.addon` の有無を判定し、存在する場合は `_wrapAddon` へ処理を委譲します。
* **`Tpl.Form._wrapAddon(ctrlHtml, addon)`**
  * **役割**: アドオン構造のHTMLを構築する純粋関数です。
  * **処理内容**: 
    * `addon.icon` と `addon.prefix` を `.prefix-container` に格納します。
    * `addon.suffix` を `.suffix-container` に格納します。
    * コントロール本体 (`ctrlHtml`) を前後コンテナで挟み、`.form-addon` クラスと配置状況に応じた `.has-prefix` / `.has-suffix` クラスを付与した文字列を返却します。

## 4. CSS仕様概要 (`ReportCSS.html`)
アドオン構造のレイアウトとサイズ調整はCSSにより自動化されています。

* **`.form-addon`**: フレックスコンテナ（`display: flex; position: relative;`）として機能し、幅を100%確保します。
* **`.prefix-container` / `.suffix-container`**: 
  * `position: absolute` でフォーム要素の上に浮動配置され、クリックイベントを透過（`pointer-events: none`）します。
  * **サイズ自動調整**: `font-size: 0.8em;` が指定されており、親要素のベースフォントサイズの0.8倍に自動で追従します。
* **Padding自動調整 (`.has-prefix` / `.has-suffix`)**: 前後のコンテナが存在する場合、下層の `input` / `select` 要素に対して適切な `padding-left` / `padding-right` を自動確保し、文字被りを防ぎます。

## 5. 記述・実装例

### 5-1. 動的バインド要素（`data-bind-fields`）の場合
HTML側に設定を記述するだけで、バインド時に自動構築されます。

**`Report.html`**
```html
<div class="prop-row">
  <label class="prop-label">欧文スタイル</label>
  <div class="prop-controls" 
       data-part="boxFontEng" 
       data-bind-fields="RPTST.ui.optFields.fontEngFields"
       data-addon-icon="text_format"
       data-addon-color="var(--theme-color)">
       <!-- JSでの要素生成時、自動的に form-addon 構造が付与される -->
  </div>
</div>

```

### 5-2. 静的要素の場合

HTMLに基本構造を記述し、初期化時に関数でバインドします。

**`Report.html`**

```html
<!-- html直書きの場合は .form-addon を自前で記述する -->
<div class="form-addon" title="アスペクト比">
  <span class="material-symbols-outlined">aspect_ratio</span>
  <span class="input-text">H:</span>
  <input type="number" name="rowAspect" class="form-control" min="0.1" max="2.0" step="0.1">
</div>

```

**`Report_APP.html` (初期化処理内)**

```javascript
// HTML内の静的要素を探索し、form-addon構造として整える
CoreUIPatcher.bindFormAddons(
  ['rowAspect'], // 対象のname属性
  null,          // fontSize (nullならCSSの0.8emに依存)
  'var(--theme-color)', // color指定
  null           // 単位の外部参照オブジェクト
);
```
```

```

```
