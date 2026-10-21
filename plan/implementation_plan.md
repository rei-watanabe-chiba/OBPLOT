# Implementation Plan: ② 検量線・標準化フェーズ(ADP)のENT統合および「検量線」シート名変更

## 1. `src/gas/Code.js`

### Target: `onOpen`, `openSidebarENT`, `openSidebarADP` (Lines 11-24)

#### Replace From (Lines 11-24)
```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("OBPLOT1.0")
    .addItem("tracer5i抽出", "openSidebarENT")
    .addItem("データ補正", "openSidebarADP")
    .addSeparator()
    .addItem("解析ボード", "openSidebarDash")
    .addToUi();
}
// --- サイドバーの呼び出し分岐 ---
function openSidebarENT() { openSidebar("entry", "tracer5iデータの抽出", "Tracer5i"); }
function openSidebarADP() { openSidebar("adapter", "データのプレビューと補正", "Tracer5i"); }
function openSidebarDash() { openSidebar("dash", "検量線・判別図解析ボード", "Dash"); }
```

#### Replace To
```javascript
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("OBPLOT1.0")
    .addItem("tracer5i抽出", "openSidebarENT")
    .addSeparator()
    .addItem("解析ボード", "openSidebarDash")
    .addToUi();
}
// --- サイドバーの呼び出し分岐 ---
function openSidebarENT() { openSidebar("entry", "tracer5iデータの抽出", "Tracer5i"); }
function openSidebarDash() { openSidebar("dash", "検量線・判別図解析ボード", "Dash"); }
```

---

## 2. `src/gas/CoreMethod.html`

### Target: `CoreMethod.Util.valdEnv` (Lines 125-130)

#### Replace From (Lines 125-130)
```javascript
        const vls = {
          tracer5i: createHeaderValidator("tracer5i"),
          pxrf: createHeaderValidator("PXRF"),
          crct: createHeaderValidator("Correction"),
          wdxrf: (h, req) => { const ms = req.filter(e => !h.includes(e)); return ms.length ? `・WDXRF必須項目不足: ${ms.join(', ')}` : null; }
        }; 
```

#### Replace To
```javascript
        const vls = {
          tracer5i: createHeaderValidator("tracer5i"),
          pxrf: createHeaderValidator("PXRF"),
          crct: createHeaderValidator("検量線"),
          wdxrf: (h, req) => { const ms = req.filter(e => !h.includes(e)); return ms.length ? `・WDXRF必須項目不足: ${ms.join(', ')}` : null; }
        }; 
```

---

## 3. `src/gas/CoreState.html`

### Target: `GLB.appShts`, `GLB.schema`, `ENT_PHS`, `AppSt.constructor` (Lines 50-116)

#### Replace From (Lines 50-116)
```javascript
    appShts: { filelist: "ファイルリスト", crct: "Correction", pxrf: "PXRF" },
    initFlags: { raw: [true, true, true, false, false], extr: [true, false, false] },
    extrFields: [
      { key: GLBidx.key1, label: `${GLBidx.key1} *必須`, placeholder: "データセット名", bind: `ENTST.EXTR.refs.${GLBidx.key1}` },
      { key: GLBidx.p1, label: GLBidx.p1, placeholder: "計測情報", bind: `ENTST.EXTR.refs.${GLBidx.p1}` },
      { key: GLBidx.p2, label: GLBidx.p2, placeholder: "計測日", bind: `ENTST.EXTR.refs.${GLBidx.p2}` }
    ],
    symbAxes: [{ val: GLBidx.key1, label: GLBidx.key1 }, { val: GLBidx.p1, label: GLBidx.p1 }, { val: GLBidx.wd1, label: GLBidx.wd1 }, { val: GLBidx.wd2, label: GLBidx.wd2 }],
    fileFields: [
      { key: "file", label: "file *必須", required: true }, { key: "mode", label: "mode *必須", required: true },
      { key: GLBidx.key2, label: `${GLBidx.key2} *必須`, required: true }, { key: "sub_id", label: "sub_id", required: false }, { key: "info", label: "info", required: false }
    ],
    confMods: [{ val: "", label: "モードを選択", disabled: true, hidden: true }, { val: "Dual", label: "Dualモード" }, { val: "Single", label: "Singleモード" }],
    schema: {
      ent: [
        { name: 'ファイルリスト', hdrType: 'filelist', clr: true },
        { name: 'File' }, { name: 'Results' },
        { name: 'tracer5i', hdrType: 'tracer5i', lock: true, validRule: 'tracer5i' }
      ],
      adp: [
        { name: 'tracer5i', hdrType: 'tracer5i', lock: true, validRule: 'tracer5i' },
        { name: 'WDXRF', hdrType: 'wdxrf', lock: true, validRule: 'wdxrf' },
        { name: 'Correction', hdrType: 'crct', lock: true, validRule: 'crct' },
        { name: 'PXRF', hdrType: 'pxrf', lock: true, validRule: 'pxrf' }
      ],
      dash: [
        { name: 'PXRF', hdrType: 'pxrf', lock: true, validRule: 'pxrf' },
        { name: 'WDXRF', hdrType: 'wdxrf', lock: true, validRule: 'wdxrf' },
        { name: 'Correction', hdrType: 'crct', lock: true, validRule: 'crct' }
      ]
    }
  };
  GLB.schema.entry = GLB.schema.ent;
  GLB.schema.adapter = GLB.schema.adp;



  // --- フェーズ定義 ---
  const ENT_PHS = { INIT: 1, READY: 2, LOAD: 3, INVALID: 4, VALID: 5, OUTPUT: 6 };
  const ADP_PHS = { INIT: 1, LOADED: 2, FILTERED: 3, MAPPED: 4, PREVIEWED: 5 };
  const DASH_PHS = { INIT: 1, LOADED: 2 };
  // --- AppSt ---
  class AppSt {
    #state; #initialState; #listeners; #updating;
    // --- セクション単位のstate生成 ---
    constructor() {
      const createSec = (overrides = {}) => ({ status: [], data: null, refs: {}, flags: [], ...overrides });
      const initDef = {
        GLB: { 
          activeTab: "ent", isLocked: false, ssId: "",
          dialog: { isOpen: false, type: "confirm", title: "", msg: "" }
        },
        ENTST: {
          phase: ENT_PHS.INIT,
          PREF: createSec({ refs: { mode: "" }, data: { modeOpts: GLB.confMods } }),
          RAW:  createSec({ flags: GLB.initFlags.raw, data: { hdrOpts: [] } }),
          EXTR: createSec({ refs: { [GLB.idx.key1]: "", [GLB.idx.p1]: "", [GLB.idx.p2]: "" }, flags: GLB.initFlags.extr })
        },
        ADPST: {
          phase: ADP_PHS.INIT,
          ASGN: createSec({ data: { crctDT: [], wrapPXRF: null, wrapWDXRF: null, pxrfDT: null, wdxrfDT: null }, refs: { available: [], filter: [] } }),
          SYMB: createSec({ refs: { baseKey: GLB.symbBaseKey, rls: [{ key: "default", target: "", shp: GLB.symbDefShp, clr: GLB.symbDefClr }] }, data: { axisOpts: GLB.symbAxes } }),
          CALB: createSec({ refs: { modeMap: [...GLB.optElms], calElms: [...GLB.valElms], crct: "new", useLOD: false, useCal: false }, data: { modeOpts: GLB.optElms, calElmOpts: GLB.valElms, crctOpts: [] } }),
          PREV: createSec({ refs: { itemMap: [], val: GLB.valLgc.length ? GLB.valLgc[0] : GLB.valElms[0], saveIndexName: "" }, data: { crctLogic: {}, prevDT: null, statsDT: null, chartSrc: null, valOpts: [...GLB.valElms, ...GLB.valLgc].map(v => ({ label: v, val: v })) } }),
          STDZ: createSec({ refs: { itemMap: [], modeMap: [...GLB.optElms], useLOD: false, saveIndexName: "" }, data: { modeOpts: GLB.optElms } })
        },
```

#### Replace To
```javascript
    appShts: { filelist: "ファイルリスト", crct: "検量線", pxrf: "PXRF" },
    initFlags: { raw: [true, true, true, false, false], extr: [true, false, false] },
    extrFields: [
      { key: GLBidx.key1, label: `${GLBidx.key1} *必須`, placeholder: "データセット名", bind: `ENTST.EXTR.refs.${GLBidx.key1}` },
      { key: GLBidx.p1, label: GLBidx.p1, placeholder: "計測情報", bind: `ENTST.EXTR.refs.${GLBidx.p1}` },
      { key: GLBidx.p2, label: GLBidx.p2, placeholder: "計測日", bind: `ENTST.EXTR.refs.${GLBidx.p2}` }
    ],
    symbAxes: [{ val: GLBidx.key1, label: GLBidx.key1 }, { val: GLBidx.p1, label: GLBidx.p1 }, { val: GLBidx.wd1, label: GLBidx.wd1 }, { val: GLBidx.wd2, label: GLBidx.wd2 }],
    fileFields: [
      { key: "file", label: "file *必須", required: true }, { key: "mode", label: "mode *必須", required: true },
      { key: GLBidx.key2, label: `${GLBidx.key2} *必須`, required: true }, { key: "sub_id", label: "sub_id", required: false }, { key: "info", label: "info", required: false }
    ],
    confMods: [{ val: "", label: "モードを選択", disabled: true, hidden: true }, { val: "Dual", label: "Dualモード" }, { val: "Single", label: "Singleモード" }],
    schema: {
      ent: [
        { name: 'ファイルリスト', hdrType: 'filelist', clr: true },
        { name: 'File' }, { name: 'Results' },
        { name: 'tracer5i', hdrType: 'tracer5i', lock: true, validRule: 'tracer5i' },
        { name: 'WDXRF', hdrType: 'wdxrf', lock: true, validRule: 'wdxrf' },
        { name: '検量線', hdrType: 'crct', lock: true, validRule: 'crct' },
        { name: 'PXRF', hdrType: 'pxrf', lock: true, validRule: 'pxrf' }
      ],
      dash: [
        { name: 'PXRF', hdrType: 'pxrf', lock: true, validRule: 'pxrf' },
        { name: 'WDXRF', hdrType: 'wdxrf', lock: true, validRule: 'wdxrf' },
        { name: '検量線', hdrType: 'crct', lock: true, validRule: 'crct' }
      ]
    }
  };
  GLB.schema.entry = GLB.schema.ent;



  // --- フェーズ定義 ---
  const ENT_PHS = { INIT: 1, READY: 2, LOAD: 3, INVALID: 4, VALID: 5, OUTPUT: 6, FILTERED: 7, PREVIEWED: 8 };
  const DASH_PHS = { INIT: 1, LOADED: 2 };
  // --- AppSt ---
  class AppSt {
    #state; #initialState; #listeners; #updating;
    // --- セクション単位のstate生成 ---
    constructor() {
      const createSec = (overrides = {}) => ({ status: [], data: null, refs: {}, flags: [], ...overrides });
      const initDef = {
        GLB: { 
          activeTab: "ent", isLocked: false, ssId: "",
          dialog: { isOpen: false, type: "confirm", title: "", msg: "" }
        },
        ENTST: {
          phase: ENT_PHS.INIT,
          PREF: createSec({ refs: { mode: "" }, data: { modeOpts: GLB.confMods } }),
          RAW:  createSec({ flags: GLB.initFlags.raw, data: { hdrOpts: [] } }),
          EXTR: createSec({ refs: { [GLB.idx.key1]: "", [GLB.idx.p1]: "", [GLB.idx.p2]: "" }, flags: GLB.initFlags.extr }),
          ASGN: createSec({ data: { crctDT: [], rawTrcDT: null, rawWdxrfDT: null, wrapPXRF: null, wrapWDXRF: null, pxrfDT: null, wdxrfDT: null }, refs: { available: [], availableItems: [], filter: [] } }),
          SYMB: createSec({ refs: { baseKey: GLB.symbBaseKey, rls: [{ key: "default", target: "", shp: GLB.symbDefShp, clr: GLB.symbDefClr }] }, data: { axisOpts: GLB.symbAxes, src: null } }),
          CALB: createSec({ refs: { modeMap: [...GLB.optElms], calElms: [...GLB.valElms], crct: "new", useLOD: false, useCal: false }, data: { modeOpts: GLB.optElms, calElmOpts: GLB.valElms, crctOpts: [] } }),
          PREV: createSec({ refs: { itemMap: [], val: GLB.valLgc.length ? GLB.valLgc[0] : GLB.valElms[0], saveIndexName: "" }, data: { crctLogic: {}, prevDT: null, statsDT: null, chartSrc: null, valOpts: [...GLB.valElms, ...GLB.valLgc].map(v => ({ label: v, val: v })) } }),
          STDZ: createSec({ refs: { itemMap: [], modeMap: [...GLB.optElms], useLOD: false, saveIndexName: "" }, data: { modeOpts: GLB.optElms } })
        },
```

---

## 4. `src/gas/Tracer5i.html`

### Target: `<nav>` and `<main>` to `<script>` (Lines 13-202)

#### Replace From (Lines 13-202)
```html
    <nav class="nav-tabs" data-part="nav">
      <button data-part="tab-btn" class="tab-btn" data-action="CoreAct.switchTab" data-param="entry" aria-selected="true">データ抽出</button>
      <button data-part="tab-btn" class="tab-btn" data-action="CoreAct.switchTab" data-param="adapter" aria-selected="false">検量線・標準化</button>
    </nav>
    <main class="scroll-y">
      <!-- ENT -->
      <div data-part="tab-content" data-param="entry" class="tab-content" aria-hidden="false" data-opts="view: active">
        <fieldset data-part="entFieldset">
          <details data-part="secPREF" open>
            <summary>抽出設定</summary>
            <div class="field-row">
              <div data-ui="addon" style="flex:1;">
                <select class="form-control" data-out="bind: ENTST.PREF.refs.mode; opts: ENTST.PREF.data.modeOpts; hasEmpty: false" data-action="ENTAct.valdPref"></select>
              </div>
            </div>
            <div data-part="barPREF" class="status-bar" data-opts="view: hidden" data-out="status: ENTST.PREF.status"></div>
          </details>
          <hr>
          <details data-part="secRAW">
            <summary>読込と検証</summary>
            <div class="flex-row">
              <button data-part="btnRAW_load" data-action="ENTAct.loadRaw" data-opts="view: primary">データを取得</button>
              <span class="txt-btninfo">読込シート:<span class="badge-label">File</span></span>
            </div>
            <div data-part="secRAW_area">
              <div class="field-row">
                <label class="prop-label">file</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="file" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.file; opts: ENTST.RAW.data.hdrOpts; invalid: ENTST.RAW.flags.0; hasEmpty: true"></select></div>
              </div>
              <div class="field-row">
                <label class="prop-label">mode</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="mode" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.mode; opts: ENTST.RAW.data.hdrOpts; invalid: ENTST.RAW.flags.1; hasEmpty: true"></select></div>
              </div>
              <div class="field-row">
                <label class="prop-label">ID</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="ID" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.ID; opts: ENTST.RAW.data.hdrOpts; invalid: ENTST.RAW.flags.2; hasEmpty: true"></select></div>
              </div>
              <div class="field-row">
                <label class="prop-label">sub_id</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="sub_id" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.sub_id; opts: ENTST.RAW.data.hdrOpts; hasEmpty: true"></select></div>
              </div>
              <div class="field-row">
                <label class="prop-label">info</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="info" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.info; opts: ENTST.RAW.data.hdrOpts; hasEmpty: true"></select></div>
              </div>
            </div>
            <div data-part="boxRAW_btn" class="field-row">
              <button data-part="btnRAW_genList" data-action="ENTAct.genList" data-opts="view: primary">リスト生成</button>
              <button data-part="btnRAW_valdList" data-action="ENTAct.valdList" data-opts="view: primary">検証</button>
            </div>
          </details>
          <div data-part="barRAW" class="status-bar" data-opts="view: hidden" data-out="status: ENTST.RAW.status"></div>
          <hr>
          <details data-part="secEXTR">
            <summary>抽出と格納</summary>
            <div class="flex-row">
              <button data-part="btnEXTR_run" data-action="ENTAct.runExtr" data-opts="view: primary">データを抽出</button>
              <span class="txt-btninfo">読込シート:<span class="badge-label">Results</span></span>
            </div>
            <div data-part="secEXTR_area">
              <div class="field-row">
                <label class="prop-label">database</label>
                <div data-ui="addon" style="flex:2.75;"><input type="text" class="form-control" placeholder="データベース名" data-out="bind: ENTST.EXTR.refs.database; invalid: ENTST.EXTR.flags.0" data-action="ENTAct.valdExtrRefs"></div>
              </div>
              <div class="field-row">
                <label class="prop-label">item</label>
                <div data-ui="addon" style="flex:2.75;;"><input type="text" class="form-control" placeholder="計測情報" data-out="bind: ENTST.EXTR.refs.item; invalid: ENTST.EXTR.flags.1"></div>
              </div>
              <div class="field-row">
                <label class="prop-label">date</label>
                <div data-ui="addon" style="flex:2.75;;"><input type="text" class="form-control" placeholder="計測日" data-out="bind: ENTST.EXTR.refs.date; invalid: ENTST.EXTR.flags.2"></div>
              </div>
            </div>
          </details>
          <div data-part="barEXTR" class="status-bar" data-opts="view: hidden" data-out="status: ENTST.EXTR.status"></div>
        </fieldset>
      </div>
      <!-- ADP (旧 Tab2) -->
      <div data-part="tab-content" data-param="adapter" class="tab-content" aria-hidden="true">
        <fieldset data-part="adpFieldset">
          <details data-part="secASGN" open>
            <summary>データ読込・選択</summary>
            <div data-part="secASGN_area">
              <label>データセット選択</label>
              <div data-ui="mselect" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ADPST.ASGN.refs.filter; opts: ADPST.ASGN.refs.available"></div>
            </div>
            <div class="txt-btninfo">読込シート<span class="badge-label">tracer5i</span><span class="badge-label">WDXRF</span><span class="badge-label">Correction</span></div>
            <div class="field-row">
              <button data-part="btnASGN_load" data-action="ADPAct.loadDB" data-opts="view: primary">データを読込</button>
              <button data-part="btnASGN_fltr" data-action="ADPAct.fltrDB" data-opts="view: primary" class="outline">データを確定</button>
            </div>
          </details>
          <div data-part="barASGN" class="status-bar" data-opts="view: hidden" data-out="status: ADPST.ASGN.status"></div>
          <hr>
          <details data-part="secSYMB">
            <summary>シンボル設定</summary>
            <div data-part="secSYMB_area">
              <label>属性選択</label>
              <div class="field-row" style="margin-top: var(--unit)">
                <div data-ui="addon" style="flex:2;">
                  <select class="form-control" data-action="ADPAct.valdAxis" data-out="bind: ADPST.SYMB.refs.baseKey; opts: ADPST.SYMB.data.axisOpts; hasEmpty: false"></select>
                </div>
                <button data-action="ADPAct.resetSymb" data-opts="view: primary" class="outline" style="flex:1;">リセット</button>
              </div>
              <label>シンボル設定</label>
              <div class="scroll-y" style="max-height: calc(var(--unit) * 50); border: 1px solid var(--grey200); border-radius: var(--unit); padding: var(--unit) calc(var(--unit) * 2);">
                <div data-ui="symbtbl" data-part="tblSYMB" data-out="src: ADPST.SYMB.data.src"></div>
              </div>
            </div>
            <div class="field-row">
              <button data-part="btnSYMB_set" data-action="ADPAct.setSymb" data-opts="view: primary">シンボル確定</button>
            </div>
          </details>
          <div data-part="barSYMB" class="status-bar" data-opts="view: hidden" data-out="status: ADPST.SYMB.status"></div>
          <hr>
          <details data-part="secPREV">
            <summary>プレビュー</summary>
            <div data-part="boxPREV_chart" style="width: 100%; height: auto;">
              <ui-plot data-out="src: ADPST.PREV.data.chartSrc"></ui-plot>
            </div>
            <div data-part="tblPREV_stats" data-out="stats: ADPST.PREV.data.statsDT"></div>
            <div data-part="secPREV_area">
              <div class="field-row">
                <div class="field-col">
                  <label>プレビュー値</label>
                  <div data-ui="addon">
                    <select class="form-control" data-out="bind: ADPST.PREV.refs.val; opts: ADPST.PREV.data.valOpts; hasEmpty: false"></select>
                  </div>
                </div>
              </div>
              <label>対象Item</label>
              <div data-ui="mselect" data-part="boxPREV_item" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ADPST.PREV.refs.itemMap; opts: ADPST.ASGN.refs.availableItems"></div>
              <div class="field-row">
                <button data-part="btnPREV_genPrev" data-action="ADPAct.genPrev" data-opts="view: primary">プレビュー更新</button>
              </div>
              <hr style="margin: calc(var(--unit) * 4) 0 calc(var(--unit) * 2);">
              <details data-part="secCALB" class="sub-sec">
                <summary>プレビュー補正設定</summary>
                <div class="field-row">
                  <div class="field-col">
                    <label>補正方法</label>
                    <div data-ui="addon">
                      <select class="form-control" data-out="bind: ADPST.CALB.refs.crct; opts: ADPST.CALB.data.crctOpts; hasEmpty: false"></select>
                    </div>
                  </div>
                </div>
                <label>Obsidianモード計測値</label>
                <div data-ui="mselect" data-part="boxCALB_mode" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ADPST.CALB.refs.modeMap; opts: ADPST.CALB.data.modeOpts"></div>
                <label>検量線適用対象</label>
                <div data-ui="mselect" data-part="boxCALB_calElm" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ADPST.CALB.refs.calElms; opts: ADPST.CALB.data.calElmOpts"></div>
                <div class="field-row">
                  <div class="field-col">
                    <div class="toggle-row"><span class="toggle-label">LOD置換</span><label class="toggle-switch"><input type="checkbox" data-out="bind: ADPST.CALB.refs.useLOD"><span class="toggle-slider"></span></label></div>
                  </div>
                  <div class="field-col">
                    <div class="toggle-row"><span class="toggle-label">検量線適用</span><label class="toggle-switch"><input type="checkbox" data-out="bind: ADPST.CALB.refs.useCal"><span class="toggle-slider"></span></label></div>
                  </div>
                </div>
              </details>
            </div>
          </details>
          <div data-part="barPREV" class="status-bar" data-opts="view: hidden" data-out="status: ADPST.PREV.status"></div>
          <hr>
          <details data-part="secSTDZ">
            <summary>出力と標準化</summary>
            <label>対象Item（検量線計算用）</label>
            <div data-ui="mselect" data-part="boxSTDZ_item" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ADPST.STDZ.refs.itemMap; opts: ADPST.ASGN.refs.availableItems"></div>
            <label>Obsidianモード計測値</label>
            <div data-ui="mselect" data-part="boxSTDZ_mode" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ADPST.STDZ.refs.modeMap; opts: ADPST.STDZ.data.modeOpts"></div>
            <div class="field-row">
              <div class="field-col">
                <div class="toggle-row"><span class="toggle-label">LOD置換</span><label class="toggle-switch"><input type="checkbox" data-out="bind: ADPST.STDZ.refs.useLOD"><span class="toggle-slider"></span></label></div>
              </div>
            </div>
            <div class="field-row" style="margin-top: calc(var(--unit) * 3);">
              <input type="text" class="form-control" placeholder="インデックス名を入力" data-out="bind: ADPST.STDZ.refs.saveIndexName">
              <button data-part="btnCALB_pushCrct" data-action="ADPAct.pushCrct" data-opts="view: primary">検量線出力</button>
            </div>
            <div class="field-row">
              <button data-part="btnSTDZ_push" data-action="ADPAct.pushStdz" data-opts="view: primary" class="outline">PXRFシート出力</button>
            </div>
          </details>
          <div data-part="barSTDZ" class="status-bar" data-opts="view: hidden" data-out="status: ADPST.STDZ.status"></div>
        </fieldset>
      </div>
    </main>
    <script>
      window.__INITIAL_SSID__ = "<?= typeof initialSsId !== 'undefined' ? initialSsId : '' ?>";
      window.__APP_MODE__ = "<?= typeof appMode !== 'undefined' ? appMode : 'entry' ?>";
    </script>
```

#### Replace To
```html
    <main class="scroll-y">
      <!-- ENT -->
      <div data-part="tab-content" data-param="entry" class="tab-content" aria-hidden="false" data-opts="view: active">
        <fieldset data-part="entFieldset">
          <details data-part="secPREF" open>
            <summary>抽出設定</summary>
            <div class="field-row">
              <div data-ui="addon" style="flex:1;">
                <select class="form-control" data-out="bind: ENTST.PREF.refs.mode; opts: ENTST.PREF.data.modeOpts; hasEmpty: false" data-action="ENTAct.valdPref"></select>
              </div>
            </div>
            <div data-part="barPREF" class="status-bar" data-opts="view: hidden" data-out="status: ENTST.PREF.status"></div>
          </details>
          <hr>
          <details data-part="secRAW">
            <summary>読込と検証</summary>
            <div class="flex-row">
              <button data-part="btnRAW_load" data-action="ENTAct.loadRaw" data-opts="view: primary">データを取得</button>
              <span class="txt-btninfo">読込シート:<span class="badge-label">File</span></span>
            </div>
            <div data-part="secRAW_area">
              <div class="field-row">
                <label class="prop-label">file</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="file" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.file; opts: ENTST.RAW.data.hdrOpts; invalid: ENTST.RAW.flags.0; hasEmpty: true"></select></div>
              </div>
              <div class="field-row">
                <label class="prop-label">mode</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="mode" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.mode; opts: ENTST.RAW.data.hdrOpts; invalid: ENTST.RAW.flags.1; hasEmpty: true"></select></div>
              </div>
              <div class="field-row">
                <label class="prop-label">ID</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="ID" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.ID; opts: ENTST.RAW.data.hdrOpts; invalid: ENTST.RAW.flags.2; hasEmpty: true"></select></div>
              </div>
              <div class="field-row">
                <label class="prop-label">sub_id</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="sub_id" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.sub_id; opts: ENTST.RAW.data.hdrOpts; hasEmpty: true"></select></div>
              </div>
              <div class="field-row">
                <label class="prop-label">info</label>
                <div data-ui="addon" style="flex:2.75;"><select class="form-control" data-param="info" data-action="ENTAct.updRawRefs" data-out="bind: ENTST.RAW.refs.info; opts: ENTST.RAW.data.hdrOpts; hasEmpty: true"></select></div>
              </div>
            </div>
            <div data-part="boxRAW_btn" class="field-row">
              <button data-part="btnRAW_genList" data-action="ENTAct.genList" data-opts="view: primary">リスト生成</button>
              <button data-part="btnRAW_valdList" data-action="ENTAct.valdList" data-opts="view: primary">検証</button>
            </div>
          </details>
          <div data-part="barRAW" class="status-bar" data-opts="view: hidden" data-out="status: ENTST.RAW.status"></div>
          <hr>
          <details data-part="secEXTR">
            <summary>抽出と格納</summary>
            <div class="flex-row">
              <button data-part="btnEXTR_run" data-action="ENTAct.runExtr" data-opts="view: primary">データを抽出</button>
              <span class="txt-btninfo">読込シート:<span class="badge-label">Results</span></span>
            </div>
            <div data-part="secEXTR_area">
              <div class="field-row">
                <label class="prop-label">database</label>
                <div data-ui="addon" style="flex:2.75;"><input type="text" class="form-control" placeholder="データベース名" data-out="bind: ENTST.EXTR.refs.database; invalid: ENTST.EXTR.flags.0" data-action="ENTAct.valdExtrRefs"></div>
              </div>
              <div class="field-row">
                <label class="prop-label">item</label>
                <div data-ui="addon" style="flex:2.75;;"><input type="text" class="form-control" placeholder="計測情報" data-out="bind: ENTST.EXTR.refs.item; invalid: ENTST.EXTR.flags.1"></div>
              </div>
              <div class="field-row">
                <label class="prop-label">date</label>
                <div data-ui="addon" style="flex:2.75;;"><input type="text" class="form-control" placeholder="計測日" data-out="bind: ENTST.EXTR.refs.date; invalid: ENTST.EXTR.flags.2"></div>
              </div>
            </div>
          </details>
          <div data-part="barEXTR" class="status-bar" data-opts="view: hidden" data-out="status: ENTST.EXTR.status"></div>
          <hr>
          <details data-part="secASGN">
            <summary>データセット選択</summary>
            <div data-part="secASGN_area">
              <label>データセット選択</label>
              <div data-ui="mselect" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ENTST.ASGN.refs.filter; opts: ENTST.ASGN.refs.available"></div>
              <div class="field-row">
                <button data-part="btnASGN_fltr" data-action="ENTAct.fltrDB" data-opts="view: primary">データを確定</button>
              </div>
            </div>
          </details>
          <div data-part="barASGN" class="status-bar" data-opts="view: hidden" data-out="status: ENTST.ASGN.status"></div>
          <hr>
          <details data-part="secPREV">
            <summary>プレビュー</summary>
            <div data-part="boxPREV_chart" style="width: 100%; height: auto;">
              <ui-plot data-out="src: ENTST.PREV.data.chartSrc"></ui-plot>
            </div>
            <div data-part="tblPREV_stats" data-out="stats: ENTST.PREV.data.statsDT"></div>
            <div data-part="secPREV_area">
              <div class="field-row">
                <div class="field-col">
                  <label>プレビュー値</label>
                  <div data-ui="addon">
                    <select class="form-control" data-out="bind: ENTST.PREV.refs.val; opts: ENTST.PREV.data.valOpts; hasEmpty: false"></select>
                  </div>
                </div>
              </div>
              <label>対象Item</label>
              <div data-ui="mselect" data-part="boxPREV_item" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ENTST.PREV.refs.itemMap; opts: ENTST.ASGN.refs.availableItems"></div>
              <div class="field-row">
                <button data-part="btnPREV_genPrev" data-action="ENTAct.genPrev" data-opts="view: primary">プレビュー更新</button>
              </div>
              <hr style="margin: calc(var(--unit) * 4) 0 calc(var(--unit) * 2);">
              <details data-part="secCALB" class="sub-sec">
                <summary>プレビュー補正設定</summary>
                <div class="field-row">
                  <div class="field-col">
                    <label>補正方法</label>
                    <div data-ui="addon">
                      <select class="form-control" data-out="bind: ENTST.CALB.refs.crct; opts: ENTST.CALB.data.crctOpts; hasEmpty: false"></select>
                    </div>
                  </div>
                </div>
                <label>Obsidianモード計測値</label>
                <div data-ui="mselect" data-part="boxCALB_mode" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ENTST.CALB.refs.modeMap; opts: ENTST.CALB.data.modeOpts"></div>
                <label>検量線適用対象</label>
                <div data-ui="mselect" data-part="boxCALB_calElm" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ENTST.CALB.refs.calElms; opts: ENTST.CALB.data.calElmOpts"></div>
                <div class="field-row">
                  <div class="field-col">
                    <div class="toggle-row"><span class="toggle-label">LOD置換</span><label class="toggle-switch"><input type="checkbox" data-out="bind: ENTST.CALB.refs.useLOD"><span class="toggle-slider"></span></label></div>
                  </div>
                  <div class="field-col">
                    <div class="toggle-row"><span class="toggle-label">検量線適用</span><label class="toggle-switch"><input type="checkbox" data-out="bind: ENTST.CALB.refs.useCal"><span class="toggle-slider"></span></label></div>
                  </div>
                </div>
              </details>
              <details data-part="secSYMB" class="sub-sec">
                <summary>シンボル設定</summary>
                <label>属性選択</label>
                <div class="field-row" style="margin-top: var(--unit)">
                  <div data-ui="addon" style="flex:2;">
                    <select class="form-control" data-action="ENTAct.valdAxis" data-out="bind: ENTST.SYMB.refs.baseKey; opts: ENTST.SYMB.data.axisOpts; hasEmpty: false"></select>
                  </div>
                  <button data-action="ENTAct.resetSymb" data-opts="view: primary" class="outline" style="flex:1;">リセット</button>
                </div>
                <label>シンボル設定</label>
                <div class="scroll-y" style="max-height: calc(var(--unit) * 50); border: 1px solid var(--grey200); border-radius: var(--unit); padding: var(--unit) calc(var(--unit) * 2);">
                  <div data-ui="symbtbl" data-part="tblSYMB" data-out="src: ENTST.SYMB.data.src"></div>
                </div>
              </details>
            </div>
          </details>
          <div data-part="barPREV" class="status-bar" data-opts="view: hidden" data-out="status: ENTST.PREV.status"></div>
          <hr>
          <details data-part="secSTDZ">
            <summary>出力と標準化</summary>
            <label>対象Item（検量線計算用）</label>
            <div data-ui="mselect" data-part="boxSTDZ_item" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ENTST.STDZ.refs.itemMap; opts: ENTST.ASGN.refs.availableItems"></div>
            <label>Obsidianモード計測値</label>
            <div data-ui="mselect" data-part="boxSTDZ_mode" data-opts="actionItem: CoreAct.tglMulti; actionAll: CoreAct.tglAllMulti" data-out="bind: ENTST.STDZ.refs.modeMap; opts: ENTST.STDZ.data.modeOpts"></div>
            <div class="field-row">
              <div class="field-col">
                <div class="toggle-row"><span class="toggle-label">LOD置換</span><label class="toggle-switch"><input type="checkbox" data-out="bind: ENTST.STDZ.refs.useLOD"><span class="toggle-slider"></span></label></div>
              </div>
            </div>
            <div class="field-row" style="margin-top: calc(var(--unit) * 3);">
              <input type="text" class="form-control" placeholder="インデックス名を入力" data-out="bind: ENTST.STDZ.refs.saveIndexName">
              <button data-part="btnCALB_pushCrct" data-action="ENTAct.pushCrct" data-opts="view: primary">検量線出力</button>
            </div>
            <div class="field-row">
              <button data-part="btnSTDZ_push" data-action="ENTAct.pushStdz" data-opts="view: primary" class="outline">PXRFシート出力</button>
            </div>
          </details>
          <div data-part="barSTDZ" class="status-bar" data-opts="view: hidden" data-out="status: ENTST.STDZ.status"></div>
        </fieldset>
      </div>
    </main>
    <script>
      window.__INITIAL_SSID__ = "<?= typeof initialSsId !== 'undefined' ? initialSsId : '' ?>";
    </script>
```

---

## 5. `src/gas/Tracer5i_App.html`

### Target 1: `ENT_SCHEMA` and `ADP_SCHEMA` (Lines 3-49)

#### Replace From (Lines 3-49)
```javascript
  const ENT_SCHEMA = {
      elements: [
        { part: "entFieldset", disablePhase: () => State.get("GLB.isLocked") },
        { part: "secPREF", activePhase: p => p === ENT_PHS.INIT, disablePhase: p => false },
        
        { part: "secRAW", activePhase: p => p >= ENT_PHS.READY, disablePhase: p => p < ENT_PHS.READY, openPhase: p => p >= ENT_PHS.READY && p < ENT_PHS.VALID },
        { part: "btnRAW_load", disablePhase: p => false, text: p => p <= ENT_PHS.READY ? "データを取得" : "再取得" },
        { part: "btnRAW_genList", activePhase: p => p >= ENT_PHS.READY, className: p => p === ENT_PHS.LOAD ? "" : "outline" },
        { part: "btnRAW_valdList", activePhase: p => p >= ENT_PHS.INVALID && !State.get("ENTST.RAW.flags").some(Boolean), className: p => p === ENT_PHS.INVALID ? "" : "outline" },
        { part: "secRAW_area", visiblePhase: p => p >= ENT_PHS.LOAD },
        { part: "boxRAW_btn", visiblePhase: p => p >= ENT_PHS.LOAD },
        
        { part: "secEXTR", activePhase: p => p >= ENT_PHS.VALID, disablePhase: p => p < ENT_PHS.VALID, openPhase: p => p >= ENT_PHS.VALID && p < ENT_PHS.OUTPUT },
        { part: "btnEXTR_run", activePhase: p => p >= ENT_PHS.VALID && !State.get("ENTST.EXTR.flags").some(Boolean) },
        { part: "secEXTR_area", visiblePhase: p => p >= ENT_PHS.VALID }
      ]
};
const ADP_SCHEMA = {
      persistPaths: [
        "ADPST.ASGN.refs.available", "ADPST.ASGN.refs.filter",
        "ADPST.SYMB.refs.baseKey", "ADPST.SYMB.refs.rls",
        "ADPST.CALB.refs.modeMap", "ADPST.CALB.refs.calElms", "ADPST.CALB.refs.crct", "ADPST.CALB.refs.useLOD", "ADPST.CALB.refs.useCal",
        "ADPST.PREV.refs.itemMap", "ADPST.PREV.refs.val", "ADPST.PREV.refs.saveIndexName",
        "ADPST.STDZ.refs.itemMap", "ADPST.STDZ.refs.modeMap", "ADPST.STDZ.refs.useLOD", "ADPST.STDZ.refs.saveIndexName",
        "ADPST.ASGN.status", "ADPST.SYMB.status", "ADPST.CALB.status", "ADPST.PREV.status", "ADPST.STDZ.status"
      ],
      elements: [
        { part: "adpFieldset", disablePhase: () => State.get("GLB.isLocked") },
        { part: "secASGN", activePhase: p => true, disablePhase: p => false, openPhase: p => p < ADP_PHS.FILTERED },
        { part: "btnASGN_load", disablePhase: p => false },
        { part: "btnASGN_fltr", activePhase: p => p >= ADP_PHS.LOADED },
        { part: "secASGN_area", visiblePhase: p => p >= ADP_PHS.LOADED },

        { part: "secSYMB", activePhase: p => p >= ADP_PHS.FILTERED, disablePhase: p => p < ADP_PHS.FILTERED, openPhase: p => p >= ADP_PHS.FILTERED && p < ADP_PHS.MAPPED },
        { part: "btnSYMB_set", activePhase: p => p >= ADP_PHS.FILTERED },
        { part: "boxSYMB_axis", activePhase: p => p >= ADP_PHS.FILTERED },
        { part: "secSYMB_area", visiblePhase: p => p >= ADP_PHS.FILTERED },

        { part: "secPREV", activePhase: p => p >= ADP_PHS.MAPPED, disablePhase: p => p < ADP_PHS.MAPPED, openPhase: p => p < ADP_PHS.MAPPED ? false : undefined },
        { part: "btnPREV_genPrev", activePhase: p => p >= ADP_PHS.MAPPED },

        { part: "secCALB", activePhase: p => p >= ADP_PHS.MAPPED, openPhase: p => p < ADP_PHS.MAPPED? false : undefined },

        { part: "secSTDZ", activePhase: p => p >= ADP_PHS.MAPPED, disablePhase: p => p < ADP_PHS.MAPPED, openPhase: p => p < ADP_PHS.MAPPED ? false : undefined }
      ]
};
```

#### Replace To
```javascript
  const ENT_SCHEMA = {
      persistPaths: [
        "ENTST.ASGN.refs.available", "ENTST.ASGN.refs.filter",
        "ENTST.SYMB.refs.baseKey", "ENTST.SYMB.refs.rls",
        "ENTST.CALB.refs.modeMap", "ENTST.CALB.refs.calElms", "ENTST.CALB.refs.crct", "ENTST.CALB.refs.useLOD", "ENTST.CALB.refs.useCal",
        "ENTST.PREV.refs.itemMap", "ENTST.PREV.refs.val", "ENTST.PREV.refs.saveIndexName",
        "ENTST.STDZ.refs.itemMap", "ENTST.STDZ.refs.modeMap", "ENTST.STDZ.refs.useLOD", "ENTST.STDZ.refs.saveIndexName",
        "ENTST.ASGN.status", "ENTST.SYMB.status", "ENTST.CALB.status", "ENTST.PREV.status", "ENTST.STDZ.status"
      ],
      elements: [
        { part: "entFieldset", disablePhase: () => State.get("GLB.isLocked") },
        { part: "secPREF", activePhase: p => p === ENT_PHS.INIT, disablePhase: p => false },
        
        { part: "secRAW", activePhase: p => p >= ENT_PHS.READY, disablePhase: p => p < ENT_PHS.READY, openPhase: p => p >= ENT_PHS.READY && p < ENT_PHS.VALID },
        { part: "btnRAW_load", disablePhase: p => false, text: p => p <= ENT_PHS.READY ? "データを取得" : "再取得" },
        { part: "btnRAW_genList", activePhase: p => p >= ENT_PHS.READY, className: p => p === ENT_PHS.LOAD ? "" : "outline" },
        { part: "btnRAW_valdList", activePhase: p => p >= ENT_PHS.INVALID && !State.get("ENTST.RAW.flags").some(Boolean), className: p => p === ENT_PHS.INVALID ? "" : "outline" },
        { part: "secRAW_area", visiblePhase: p => p >= ENT_PHS.LOAD },
        { part: "boxRAW_btn", visiblePhase: p => p >= ENT_PHS.LOAD },
        
        { part: "secEXTR", activePhase: p => p >= ENT_PHS.VALID, disablePhase: p => p < ENT_PHS.VALID, openPhase: p => p >= ENT_PHS.VALID && p < ENT_PHS.OUTPUT },
        { part: "btnEXTR_run", activePhase: p => p >= ENT_PHS.VALID && !State.get("ENTST.EXTR.flags").some(Boolean) },
        { part: "secEXTR_area", visiblePhase: p => p >= ENT_PHS.VALID },

        { part: "secASGN", activePhase: p => p >= ENT_PHS.OUTPUT, disablePhase: p => p < ENT_PHS.OUTPUT, openPhase: p => p === ENT_PHS.OUTPUT },
        { part: "btnASGN_fltr", activePhase: p => p >= ENT_PHS.OUTPUT },
        { part: "secASGN_area", visiblePhase: p => p >= ENT_PHS.OUTPUT },

        { part: "secPREV", activePhase: p => p >= ENT_PHS.FILTERED, disablePhase: p => p < ENT_PHS.FILTERED, openPhase: p => p < ENT_PHS.FILTERED ? false : undefined },
        { part: "btnPREV_genPrev", activePhase: p => p >= ENT_PHS.FILTERED },
        { part: "secPREV_area", visiblePhase: p => p >= ENT_PHS.FILTERED },
        { part: "secCALB", activePhase: p => p >= ENT_PHS.FILTERED, openPhase: p => p < ENT_PHS.FILTERED ? false : undefined },
        { part: "secSYMB", activePhase: p => p >= ENT_PHS.FILTERED, openPhase: p => p < ENT_PHS.FILTERED ? false : undefined },

        { part: "secSTDZ", activePhase: p => p >= ENT_PHS.FILTERED, disablePhase: p => p < ENT_PHS.FILTERED, openPhase: p => p < ENT_PHS.FILTERED ? false : undefined }
      ]
};
```

### Target 2: `ENTAct`, `ADPAct`, `TrcInit` (Lines 140-447)

#### Replace From (Lines 140-447)
```javascript
    static valdPref(tgt) {
      const mode = tgt.value;
      if (!mode) return;
      const passSts = ["message", mode === "Dual" ? "Obsidian/mudrockセット抽出対応" : "1ファイル単位抽出（モード混在可）"];
      const phs = State.get("ENTST.phase"), isInit = phs === ENT_PHS.INIT, isInvalid = phs >= ENT_PHS.INVALID;
      if (isInvalid) { 
        const errSts = ["error", "設定変更検知: リストの再生成・検証が必要です"];
        State.set({ "ENTST.RAW.status": errSts, "ENTST.RAW.cachedStatus": errSts, "ENTST.EXTR.status": ["hidden", ""] });
      }
      State.set({ "ENTST.PREF.status": passSts, ...(isInit || isInvalid ? { "ENTST.phase": isInit ? ENT_PHS.READY : ENT_PHS.INVALID } : {}) });
    }

    static updRawRefs(tgt, param) {
      State.set(`ENTST.RAW.refs.${param}`, tgt.value);
      ENTAct.valdRawRefs();
    }
    static valdRawRefs() {
      const flags = CoreMethod.Util.validateSelect(GLB.fileFields.map(f => State.get(`ENTST.RAW.refs.${f.key}`) ?? ""), 3);
      const errSts = flags.some(Boolean) ? ["error", "エラー: 列選択"] : State.get("ENTST.RAW.cachedStatus");
      State.set({ "ENTST.RAW.flags": flags, "ENTST.RAW.status": errSts });
    }
    static valdExtrRefs() {
      const isErr = !(State.get(`ENTST.EXTR.refs.${GLB.idx.key1}`)?.trim());
      const phs = State.get("ENTST.phase");
      State.set({
        "ENTST.EXTR.flags": [isErr, false, false],
        ...(phs >= ENT_PHS.VALID && {
          "ENTST.phase": ENT_PHS.VALID,
          "ENTST.EXTR.status": isErr ? ["error", `エラー: ${GLB.idx.key1}未入力`] : ["hidden", ""]
        })
      });
    }
    static async loadRaw() {
      const hasData = State.get("ENTST.RAW.data.hdrOpts")?.length > 0;
      const promptMsg = hasData ? "データをリセットしますか？" : "Fileシートを読込ますか？";
      await CoreAct.withAsync("ENTST.RAW.status", promptMsg, async () => {
        const { data, msg } = await API.pullDT(ENTAct.ssId, GLB.rawShts.file, 5);
        State.set({ 
          "ENTST.RAW.data": data,
          "ENTST.RAW.refs": Object.fromEntries(GLB.fileFields.map(f => [f.key, ""])), 
          "ENTST.RAW.flags": [true, true, true, false, false], 
          "ENTST.RAW.cachedStatus": ["success", msg], 
          "ENTST.phase": ENT_PHS.LOAD,
          "ENTST.EXTR.status": ["hidden", ""],
          "ENTST.EXTR.flags": [true, false, false]
        });
        ENTAct.valdRawRefs(); 
        return State.get("ENTST.RAW.status"); 
      });
    }
    static async stateDI(rawDT, act = "make") {
      const outDT = Mtd.ENT.valdList(rawDT, CoreMethod.Util.genHeader('filelist'), GLB.validModes, State.get("ENTST.PREF.refs.mode"));
      const isErr = outDT.slice(1).some(r => r.at(-1) !== ""); 
      const statArr = act === "extract"
        ? (isErr ? ["alert", "抽出中断: リストの再検証が必要です"] : State.get("ENTST.RAW.cachedStatus"))
        : [isErr ? "alert" : "success", `${act === "validate" ? "検証" : "リスト生成"}完了: err${isErr ? "あり" : "なし"}`];
      const newPhase = isErr ? ENT_PHS.INVALID : ENT_PHS.VALID;
      State.set({ 
        "ENTST.RAW.cachedStatus": statArr, 
        "ENTST.RAW.status": statArr, 
        "ENTST.phase": newPhase, 
        ...((isErr || act !== "extract") && { "ENTST.EXTR.status": ["hidden", ""] }) 
      });
      if (!isErr && act !== "extract") ENTAct.valdExtrRefs();
      return { isErr, outDT, statArr };
    }
    static async genList() {
      ENTAct.valdRawRefs();
      const { RAW } = State.proxy.ENTST;
      if (RAW.flags.some(Boolean)) return;
      await CoreAct.withAsync("ENTST.RAW.status", "「ファイルリスト」を上書きしますか？", async () => {
        const { statArr, outDT } = await ENTAct.stateDI(CoreMethod.Util.remapArry(RAW.data, GLB.fileFields.map(f => RAW.refs[f.key] ? RAW.data[0].indexOf(RAW.refs[f.key]) : -1), CoreMethod.Util.genHeader('rawFile')), "make");
        await API.pushDT(ENTAct.ssId, GLB.appShts.filelist, outDT, "rule");
        return statArr;
      });
    }
    static async valdList() {
      await CoreAct.withAsync("ENTST.RAW.status", "「ファイルリスト」を上書きしますか？", async () => {
        const { data } = await API.pullDT(ENTAct.ssId, GLB.appShts.filelist, 5, 5);
        const { statArr, outDT } = await ENTAct.stateDI(data, "validate");
        await API.pushDT(ENTAct.ssId, GLB.appShts.filelist, outDT, "rule");
        return statArr;
      });
    }
    static async runExtr() {
      State.set("GLB.isLocked", true);
      State.set("ENTST.EXTR.status", ["loading", "データ確認・抽出中..."]);
      let chkRes, extrDT, vFileDT;
      try {
        const [fRes, rRes, tRes] = await API.pullMult(ENTAct.ssId, [
          { sht: GLB.appShts.filelist, qCol: 5, lCol: 5 },
          { sht: GLB.rawShts.results },
          { sht: GLB.rawShts.tracer5i }
        ]);
        if (!fRes.success) throw new Error(fRes.msg);
        if (!rRes.success) throw new Error(rRes.msg);
        const diRes = await ENTAct.stateDI(fRes.pld.data, "extract");
        vFileDT = diRes.outDT;
        if (diRes.isErr) {
          await API.pushDT(ENTAct.ssId, GLB.appShts.filelist, vFileDT, "rule");
          State.set("GLB.isLocked", false);
          return;
        }
        extrDT = Mtd.ENT.genExtr(vFileDT, rRes.pld.data, State.get("ENTST.EXTR.refs"));
        if (!extrDT || extrDT.length <= 1) throw new Error("対象データなし");
        const trcDT = (tRes?.success && tRes.pld?.data) ? tRes.pld.data : [CoreMethod.Util.genHeader('tracer5i')];
        chkRes = Mtd.ENT.valdPxrf(trcDT, extrDT);
      } catch (e) {
        State.set("ENTST.EXTR.status", ["error", e.message]);
        State.set("GLB.isLocked", false);
        return;
      }
      State.set({ "ENTST.EXTR.status": ["hidden", ""], "GLB.isLocked": false });
      const msg = chkRes.isDup ? "重複IDがあります。上書き格納しますか？" : "tracer5iシートに格納しますか？";
      await CoreAct.withAsync("ENTST.EXTR.status", msg, async () => {
        const pRes = await API.pushMult(ENTAct.ssId, [
          { sht: GLB.appShts.filelist, data: vFileDT, opts: "rule" },
          { sht: GLB.rawShts.tracer5i, data: chkRes.isDup ? chkRes.data : extrDT.slice(1), opts: chkRes.isDup ? "clear" : ["append"] }
        ]);
        const errRes = pRes?.find(r => !r.success);
        if (errRes) throw new Error(errRes.msg);
        State.set("ENTST.phase", ENT_PHS.OUTPUT);
        return `格納完了: ${extrDT.length - 1} 件`;
      });
    }
  }

  // --- ADPAct (旧 T2Action: グラフ作成・分析) ---
  class ADPAct {
    static get ssId() { return State.get("GLB.ssId"); }
    static async loadDB() {
      await CoreAct.withAsync("ADPST.ASGN.status", async () => {
        const [pData, wData, cData] = await CoreAct.ensureFetch(ADPAct.ssId, [GLB.rawShts.tracer5i, GLB.rawShts.wdxrf, GLB.appShts.crct]);
        if (!pData || pData.length <= 1) throw new Error("tracer5i不足");
        if (!wData || wData.length <= 1) throw new Error("WDXRF不足");
        State.reset(['ADPST.ASGN', 'ADPST.SYMB', 'ADPST.CALB', 'ADPST.PREV', 'ADPST.STDZ']);
        const { pxrfDT: wrapPXRF, wdxrfDT: wrapWDXRF, dbs } = CoreMethod.Util.genDB(pData, wData, { mixWD: true });
        const { ASGN, CALB, STDZ } = State.proxy.ADPST;
        State.set({
          "ADPST.ASGN.data": { ...ASGN.data, wrapPXRF, wrapWDXRF, crctDT: cData || [] },
          "ADPST.ASGN.refs": { ...ASGN.refs, available: dbs, filter: dbs },
          "ADPST.CALB.refs": { ...CALB.refs, modeMap: [...GLB.optElms], calElms: [...GLB.valElms] },
          "ADPST.STDZ.refs": { ...STDZ.refs, modeMap: [...GLB.optElms] },
          "ADPST.phase": ADP_PHS.LOADED
        });
        return `読込完了: database ${dbs.length}件`;
      });
    }
    static async fltrDB() {
      await CoreAct.withAsync("ADPST.ASGN.status", async () => {
        const { ASGN } = State.proxy.ADPST;
        if (!ASGN.refs.filter?.length) throw new Error("DB未選択");
        State.reset(['ADPST.SYMB', 'ADPST.CALB', 'ADPST.PREV', 'ADPST.STDZ']);
        const { pxrfDT, wdxrfDT } = CoreMethod.Util.fltrDB(ASGN.data.wrapPXRF, ASGN.data.wrapWDXRF, ASGN.refs.filter, true);
        State.set({ 
          "ADPST.ASGN.data.pxrfDT": pxrfDT, 
          "ADPST.ASGN.data.wdxrfDT": wdxrfDT, 
          "ADPST.ASGN.data.crctDT": [...ASGN.data.crctDT],
          "ADPST.phase": ADP_PHS.FILTERED 
        }); 
        return "データ更新";
      });
    }
    static async setSymb() { 
      await CoreAct.withAsync("ADPST.SYMB.status", async () => { 
        State.set({
          "ADPST.phase": ADP_PHS.MAPPED,
          "ADPST.PREV.status": ["message", "検量線プレビュー"],
          "ADPST.STDZ.status": ["message", "検量線とPXRFデータの出力"]
        }); 
        return "シンボル確定"; 
      }); 
    }
    static async resetSymb() { State.reset("ADPST.SYMB.refs.rls"); }
    static async valdAxis(tgtSelect) {
      const newVal = tgtSelect.value, oldVal = State.get("ADPST.SYMB.refs.baseKey");
      if (newVal === oldVal) return;
      const isConfirmed = await CoreAct.withAsync("ADPST.SYMB.status", { title: "警告", msg: "属性を変更してシンボル設定をリセットします。" }, async () => {
        State.set({ "ADPST.SYMB.refs.baseKey": newVal }); 
        State.reset("ADPST.SYMB.refs.rls");
        return ["hidden", ""];
      });
      if (!isConfirmed) {
        tgtSelect.value = oldVal;
        State.set("ADPST.SYMB.refs.baseKey", oldVal);
      }
    }
    static addSymb() { State.set("ADPST.SYMB.refs.rls", [...(State.get("ADPST.SYMB.refs.rls") ?? []), { key: `rule_${Date.now()}`, target: "", shp: GLB.symbDefShp, clr: GLB.symbDefClr }]); }
    static removeSymb(tgtBtn, param) {
      const key = param || tgtBtn.dataset.param;
      if (key) State.set("ADPST.SYMB.refs.rls", (State.get("ADPST.SYMB.refs.rls") ?? []).filter(r => r.key !== key));
    }
    static updSymb(tgtBtn, param, subParam) {
      const idx = param || tgtBtn.dataset.param, type = subParam || tgtBtn.dataset.subParam;
      if (idx == null || !type) return;
      const rls = [...(State.get("ADPST.SYMB.refs.rls") ?? [])];
      if (rls[idx]) { rls[idx][type] = tgtBtn.value; State.set("ADPST.SYMB.refs.rls", rls); }
    }
    static async genPrev() {
      await CoreAct.withAsync("ADPST.PREV.status", async () => {
        const { PREV, CALB, ASGN, SYMB } = State.proxy.ADPST;
        const conf = { ...PREV.refs, ...CALB.refs, crctDT: ASGN.data.crctDT, graphType: 'calib', calbVal: PREV.refs.val }; 
        const { prevDT, statsDT } = CHARTDT.genChartDB(ASGN.data.pxrfDT, ASGN.data.wdxrfDT, conf);
        if (!prevDT.length) throw new Error("対象データなし");
        const chartConfig = {
          data: { prevDT, statsDT },
          symb: SYMB.refs,
          panel: { title: "", xLabel: "WDXRF", yLabel: "pXRF", graphType: "calib" },
          gph: { style: GLB.defGraphStyle, gap: GLB.defGraphGap },
          layout: { aspectMode: 'square' }
        };
        State.set({ 
          "ADPST.PREV.data.crctLogic": statsDT, 
          "ADPST.PREV.data.statsDT": statsDT, 
          "ADPST.PREV.data.prevDT": prevDT,
          "ADPST.PREV.data.chartSrc": chartConfig,
          "ADPST.phase": ADP_PHS.PREVIEWED 
        }); 
        return ["message", "データと検量線のプレビュー"];
      });
    }
    static async pushCrct() {
      const idxNm = State.get("ADPST.STDZ.refs.saveIndexName")?.trim();
      if (!idxNm) { State.set("ADPST.STDZ.status", ["error", "名前が未入力です"]); return; }
      const { ASGN, STDZ } = State.proxy.ADPST;
      const hasOriginal = ASGN.data.crctDT?.length > 0;
      const updDT = hasOriginal ? [...ASGN.data.crctDT] : [CoreMethod.Util.genHeader('crct')];
      const dupIdx = updDT.findIndex((r, i) => i > 0 && r[0] === idxNm);
      const isDup = dupIdx > 0;
      const msg = isDup ? `全対象元素の検量線を上書きしますか？\n名前：${idxNm}` : `全対象元素の検量線を出力しますか？\n名前：${idxNm}`;
      await CoreAct.withAsync("ADPST.STDZ.status", msg, async () => {
        const newRow = Mtd.ADP.genCALB(ASGN.data.pxrfDT, ASGN.data.wdxrfDT, STDZ.refs, idxNm);
        let pushData, pushOpts;
        if (isDup) { updDT[dupIdx] = newRow; pushData = updDT; pushOpts = "clear";
        } else { updDT.push(newRow); pushData = hasOriginal ? [newRow] : updDT; pushOpts = hasOriginal ? ["append"] : "clear"; }
        await API.pushDT(ADPAct.ssId, GLB.appShts.crct, pushData, pushOpts);
        State.set({ "ADPST.ASGN.data.crctDT": updDT, "ADPST.STDZ.refs.saveIndexName": "" }); 
        return `補正値を${isDup ? '上書き' : '保存'}しました`;
      });
    }
    static async pushStdz() {
      await CoreAct.withAsync("ADPST.STDZ.status", "PXRFシートに出力しますか？", async () => {
        const { ASGN, STDZ } = State.proxy.ADPST;
        const outDT = Mtd.ADP.genNewPxrf(ASGN.data.pxrfDT, STDZ.refs.modeMap);
        await API.pushDT(ADPAct.ssId, GLB.appShts.pxrf, outDT, "clear");
        return "PXRFシートの出力を完了しました";
      });
    }
    static renewADPState() {
      const { ASGN, SYMB, PREV, STDZ } = State.proxy.ADPST;
      const baseDT = ASGN.data.pxrfDT;
      if (!baseDT?.length) { State.set({ "ADPST.ASGN.refs.availableItems": [], "ADPST.SYMB.data.src": null }); return; }
      const items = [...new Set(baseDT.map(d => d[GLB.idx.p1]).filter(Boolean))];
      const vals = [...new Set(baseDT.map(d => d[SYMB.refs.baseKey]).filter(Boolean))];
      const targetOpts = [{ val: "", label: "未選択" }, ...vals.map(v => ({ val: v, label: v }))];
      const optsConf = { target: targetOpts, shp: GLB.symbShapes, clr: GLB.symbColors };
      const actsConf = { add: "ADPAct.addSymb", remove: "ADPAct.removeSymb", update: "ADPAct.updSymb" };
      State.set({
        "ADPST.ASGN.refs.availableItems": items,
        "ADPST.PREV.refs.itemMap": PREV.refs.itemMap?.length ? PREV.refs.itemMap : items,
        "ADPST.STDZ.refs.itemMap": STDZ.refs.itemMap?.length ? STDZ.refs.itemMap : items,
        "ADPST.SYMB.data.src": { rls: SYMB.refs.rls, optsConf, actsConf } 
      });
    }
  }
  // --- TrcInit ---
  class TrcInit {
    static async start() {
      const urlParams = new URLSearchParams(window.location.search);
      const actMode = window.__APP_MODE__ || urlParams.get('mode') || 'entry';
      CoreAct.rootGLB({ CoreAct, ENTAct, ADPAct, });
      CoreAct.cfgRslv = (tabPRM) => {
        return (tabPRM === 'ent' || tabPRM === 'entry')
          ? { schemaKey: 'ent', statPath: 'ENTST.PREF.status', schema: ENT_SCHEMA }
          : { schemaKey: 'adp', statPath: 'ADPST.ASGN.status', schema: ADP_SCHEMA, persistPaths: ADP_SCHEMA.persistPaths };
      };
      const automatorENT = new CoreUI(ENT_SCHEMA, 'ENTST');
      const automatorADP = new CoreUI(ADP_SCHEMA, 'ADPST');
      automatorENT.build();
      automatorADP.build();
      State.subscribe("ENTST.phase", () => automatorENT.update());
      State.subscribe("ADPST.phase", () => automatorADP.update());
      State.subscribe("ENTST.RAW.flags", () => automatorENT.update());
      State.subscribe("ENTST.EXTR.flags", () => automatorENT.update());
      State.subscribe("GLB.isLocked", () => {
        automatorENT.update();
        automatorADP.update();
      });
      State.subscribe(`ENTST.EXTR.refs.${GLB.idx.key1}`, () => ENTAct.valdExtrRefs());
      State.subscribe("ENTST.RAW.data", data => {
        if (data?.[0]) State.set("ENTST.RAW.data.hdrOpts", data[0].map(h => ({ label: h, val: h })));
        else State.set("ENTST.RAW.data.hdrOpts", []);
      });
      State.subscribe("ADPST.ASGN.data.crctDT", data => {
        if (!data) return;
        const opts = [{ label: "新規検量線", val: "new" }, ...data.slice(1).filter(r => r[0]).map(r => ({ label: r[0], val: r[0] }))];
        State.set("ADPST.CALB.data.crctOpts", opts);
      });
      State.subscribe("ADPST.ASGN.data.pxrfDT", () => ADPAct.renewADPState());
      State.subscribe("ADPST.SYMB.refs.baseKey", () => ADPAct.renewADPState());
      State.subscribe("ADPST.SYMB.refs.rls", () => ADPAct.renewADPState());
      const hooks = {};
      const ssId = window.__INITIAL_SSID__ || "EXCEL_LOCAL_RUN";
      CoreAct.actvTab(actMode);
      const initCfg = CoreAct.cfgRslv(actMode);
      await CoreAct.startSession(ssId, false, hooks, initCfg);
    }
  }
```

#### Replace To
```javascript
    static valdPref(tgt) {
      const mode = tgt.value;
      if (!mode) return;
      const passSts = ["message", mode === "Dual" ? "Obsidian/mudrockセット抽出対応" : "1ファイル単位抽出（モード混在可）"];
      const phs = State.get("ENTST.phase"), isInit = phs === ENT_PHS.INIT, isInvalid = phs >= ENT_PHS.INVALID;
      if (isInvalid) { 
        const errSts = ["error", "設定変更検知: リストの再生成・検証が必要です"];
        State.set({
          "ENTST.RAW.status": errSts,
          "ENTST.RAW.cachedStatus": errSts,
          "ENTST.EXTR.status": ["hidden", ""],
          "ENTST.ASGN.status": ["hidden", ""],
          "ENTST.PREV.status": ["hidden", ""],
          "ENTST.STDZ.status": ["hidden", ""]
        });
      }
      State.set({ "ENTST.PREF.status": passSts, ...(isInit || isInvalid ? { "ENTST.phase": isInit ? ENT_PHS.READY : ENT_PHS.INVALID } : {}) });
    }

    static updRawRefs(tgt, param) {
      State.set(`ENTST.RAW.refs.${param}`, tgt.value);
      ENTAct.valdRawRefs();
    }
    static valdRawRefs() {
      const flags = CoreMethod.Util.validateSelect(GLB.fileFields.map(f => State.get(`ENTST.RAW.refs.${f.key}`) ?? ""), 3);
      const errSts = flags.some(Boolean) ? ["error", "エラー: 列選択"] : State.get("ENTST.RAW.cachedStatus");
      State.set({ "ENTST.RAW.flags": flags, "ENTST.RAW.status": errSts });
    }
    static valdExtrRefs() {
      const isErr = !(State.get(`ENTST.EXTR.refs.${GLB.idx.key1}`)?.trim());
      const phs = State.get("ENTST.phase");
      State.set({
        "ENTST.EXTR.flags": [isErr, false, false],
        ...(phs >= ENT_PHS.VALID && {
          "ENTST.phase": ENT_PHS.VALID,
          "ENTST.EXTR.status": isErr ? ["error", `エラー: ${GLB.idx.key1}未入力`] : ["hidden", ""],
          "ENTST.ASGN.status": ["hidden", ""],
          "ENTST.PREV.status": ["hidden", ""],
          "ENTST.STDZ.status": ["hidden", ""]
        })
      });
    }
    static async loadRaw() {
      const hasData = State.get("ENTST.RAW.data.hdrOpts")?.length > 0;
      const promptMsg = hasData ? "データをリセットしますか？" : "Fileシートを読込ますか？";
      await CoreAct.withAsync("ENTST.RAW.status", promptMsg, async () => {
        const { data, msg } = await API.pullDT(ENTAct.ssId, GLB.rawShts.file, 5);
        State.set({ 
          "ENTST.RAW.data": data,
          "ENTST.RAW.refs": Object.fromEntries(GLB.fileFields.map(f => [f.key, ""])), 
          "ENTST.RAW.flags": [true, true, true, false, false], 
          "ENTST.RAW.cachedStatus": ["success", msg], 
          "ENTST.phase": ENT_PHS.LOAD,
          "ENTST.EXTR.status": ["hidden", ""],
          "ENTST.EXTR.flags": [true, false, false],
          "ENTST.ASGN.status": ["hidden", ""],
          "ENTST.PREV.status": ["hidden", ""],
          "ENTST.STDZ.status": ["hidden", ""]
        });
        ENTAct.valdRawRefs(); 
        return State.get("ENTST.RAW.status"); 
      });
    }
    static async stateDI(rawDT, act = "make") {
      const outDT = Mtd.ENT.valdList(rawDT, CoreMethod.Util.genHeader('filelist'), GLB.validModes, State.get("ENTST.PREF.refs.mode"));
      const isErr = outDT.slice(1).some(r => r.at(-1) !== ""); 
      const statArr = act === "extract"
        ? (isErr ? ["alert", "抽出中断: リストの再検証が必要です"] : State.get("ENTST.RAW.cachedStatus"))
        : [isErr ? "alert" : "success", `${act === "validate" ? "検証" : "リスト生成"}完了: err${isErr ? "あり" : "なし"}`];
      const newPhase = isErr ? ENT_PHS.INVALID : ENT_PHS.VALID;
      State.set({ 
        "ENTST.RAW.cachedStatus": statArr, 
        "ENTST.RAW.status": statArr, 
        "ENTST.phase": newPhase, 
        ...((isErr || act !== "extract") && {
          "ENTST.EXTR.status": ["hidden", ""],
          "ENTST.ASGN.status": ["hidden", ""],
          "ENTST.PREV.status": ["hidden", ""],
          "ENTST.STDZ.status": ["hidden", ""]
        }) 
      });
      if (!isErr && act !== "extract") ENTAct.valdExtrRefs();
      return { isErr, outDT, statArr };
    }
    static async genList() {
      ENTAct.valdRawRefs();
      const { RAW } = State.proxy.ENTST;
      if (RAW.flags.some(Boolean)) return;
      await CoreAct.withAsync("ENTST.RAW.status", "「ファイルリスト」を上書きしますか？", async () => {
        const { statArr, outDT } = await ENTAct.stateDI(CoreMethod.Util.remapArry(RAW.data, GLB.fileFields.map(f => RAW.refs[f.key] ? RAW.data[0].indexOf(RAW.refs[f.key]) : -1), CoreMethod.Util.genHeader('rawFile')), "make");
        await API.pushDT(ENTAct.ssId, GLB.appShts.filelist, outDT, "rule");
        return statArr;
      });
    }
    static async valdList() {
      await CoreAct.withAsync("ENTST.RAW.status", "「ファイルリスト」を上書きしますか？", async () => {
        const { data } = await API.pullDT(ENTAct.ssId, GLB.appShts.filelist, 5, 5);
        const { statArr, outDT } = await ENTAct.stateDI(data, "validate");
        await API.pushDT(ENTAct.ssId, GLB.appShts.filelist, outDT, "rule");
        return statArr;
      });
    }
    static async initDB() {
      State.set("ENTST.PREF.status", ["loading", "初期データ読込中..."]);
      try {
        const [pData, wData, cData] = await CoreAct.ensureFetch(ENTAct.ssId, [GLB.rawShts.tracer5i, GLB.rawShts.wdxrf, GLB.appShts.crct]);
        State.set({
          "ENTST.ASGN.data.rawTrcDT": pData || null,
          "ENTST.ASGN.data.rawWdxrfDT": wData || null,
          "ENTST.ASGN.data.crctDT": cData || []
        });
        if (pData?.length > 1 && wData?.length > 1) {
          ENTAct.syncTrcDB(pData, wData, false);
        }
      } finally {
        State.set("ENTST.PREF.status", ["hidden", ""]);
      }
    }
    static syncTrcDB(pData, wData = State.get("ENTST.ASGN.data.rawWdxrfDT"), showStatus = true) {
      if (!pData || pData.length <= 1 || !wData || wData.length <= 1) {
        State.set("ENTST.ASGN.data.rawTrcDT", pData || null);
        return;
      }
      const { pxrfDT: wrapPXRF, wdxrfDT: wrapWDXRF, dbs } = CoreMethod.Util.genDB(pData, wData, { mixWD: true });
      const { ASGN, CALB, STDZ } = State.proxy.ENTST;
      State.set({
        "ENTST.ASGN.data": { ...ASGN.data, rawTrcDT: pData, rawWdxrfDT: wData, wrapPXRF, wrapWDXRF },
        "ENTST.ASGN.refs": { ...ASGN.refs, available: dbs, filter: dbs },
        "ENTST.CALB.refs": { ...CALB.refs, modeMap: [...GLB.optElms], calElms: [...GLB.valElms] },
        "ENTST.STDZ.refs": { ...STDZ.refs, modeMap: [...GLB.optElms] },
        ...(showStatus && { "ENTST.ASGN.status": ["message", `対象database: ${dbs.length}件`] })
      });
    }
    static async runExtr() {
      State.set("GLB.isLocked", true);
      State.set("ENTST.EXTR.status", ["loading", "データ確認・抽出中..."]);
      let chkRes, extrDT, vFileDT, trcDT;
      try {
        const [fRes, rRes, tRes] = await API.pullMult(ENTAct.ssId, [
          { sht: GLB.appShts.filelist, qCol: 5, lCol: 5 },
          { sht: GLB.rawShts.results },
          { sht: GLB.rawShts.tracer5i }
        ]);
        if (!fRes.success) throw new Error(fRes.msg);
        if (!rRes.success) throw new Error(rRes.msg);
        const diRes = await ENTAct.stateDI(fRes.pld.data, "extract");
        vFileDT = diRes.outDT;
        if (diRes.isErr) {
          await API.pushDT(ENTAct.ssId, GLB.appShts.filelist, vFileDT, "rule");
          State.set("GLB.isLocked", false);
          return;
        }
        extrDT = Mtd.ENT.genExtr(vFileDT, rRes.pld.data, State.get("ENTST.EXTR.refs"));
        if (!extrDT || extrDT.length <= 1) throw new Error("対象データなし");
        trcDT = (tRes?.success && tRes.pld?.data) ? tRes.pld.data : [CoreMethod.Util.genHeader('tracer5i')];
        chkRes = Mtd.ENT.valdPxrf(trcDT, extrDT);
      } catch (e) {
        State.set("ENTST.EXTR.status", ["error", e.message]);
        State.set("GLB.isLocked", false);
        return;
      }
      State.set({ "ENTST.EXTR.status": ["hidden", ""], "GLB.isLocked": false });
      const msg = chkRes.isDup ? "重複IDがあります。上書き格納しますか？" : "tracer5iシートに格納しますか？";
      await CoreAct.withAsync("ENTST.EXTR.status", msg, async () => {
        const pRes = await API.pushMult(ENTAct.ssId, [
          { sht: GLB.appShts.filelist, data: vFileDT, opts: "rule" },
          { sht: GLB.rawShts.tracer5i, data: chkRes.isDup ? chkRes.data : extrDT.slice(1), opts: chkRes.isDup ? "clear" : ["append"] }
        ]);
        const errRes = pRes?.find(r => !r.success);
        if (errRes) throw new Error(errRes.msg);
        const finalTrcDT = chkRes.isDup ? chkRes.data : [...trcDT, ...extrDT.slice(1)];
        let wData = State.get("ENTST.ASGN.data.rawWdxrfDT");
        if (!wData || wData.length <= 1) {
          const [fetchedW] = await CoreAct.ensureFetch(ENTAct.ssId, [GLB.rawShts.wdxrf]);
          wData = fetchedW || null;
        }
        ENTAct.syncTrcDB(finalTrcDT, wData, true);
        State.set("ENTST.phase", ENT_PHS.OUTPUT);
        return `格納完了: ${extrDT.length - 1} 件`;
      });
    }
    static async fltrDB() {
      await CoreAct.withAsync("ENTST.ASGN.status", async () => {
        const { ASGN } = State.proxy.ENTST;
        if (!ASGN.data.rawTrcDT || ASGN.data.rawTrcDT.length <= 1) throw new Error("tracer5i不足");
        if (!ASGN.data.rawWdxrfDT || ASGN.data.rawWdxrfDT.length <= 1) throw new Error("WDXRF不足");
        if (!ASGN.refs.filter?.length) throw new Error("DB未選択");
        State.reset(['ENTST.SYMB', 'ENTST.CALB', 'ENTST.PREV', 'ENTST.STDZ']);
        const { pxrfDT, wdxrfDT } = CoreMethod.Util.fltrDB(ASGN.data.wrapPXRF, ASGN.data.wrapWDXRF, ASGN.refs.filter, true);
        State.set({
          "ENTST.ASGN.data.pxrfDT": pxrfDT,
          "ENTST.ASGN.data.wdxrfDT": wdxrfDT,
          "ENTST.ASGN.data.crctDT": [...ASGN.data.crctDT],
          "ENTST.PREV.status": ["message", "検量線プレビュー"],
          "ENTST.STDZ.status": ["message", "検量線とPXRFデータの出力"],
          "ENTST.phase": ENT_PHS.FILTERED
        });
        return "データ更新";
      });
    }
    static async resetSymb() { State.reset("ENTST.SYMB.refs.rls"); }
    static async valdAxis(tgtSelect) {
      const newVal = tgtSelect.value, oldVal = State.get("ENTST.SYMB.refs.baseKey");
      if (newVal === oldVal) return;
      const isConfirmed = await CoreAct.withAsync("ENTST.PREV.status", { title: "警告", msg: "属性を変更してシンボル設定をリセットします。" }, async () => {
        State.set({ "ENTST.SYMB.refs.baseKey": newVal });
        State.reset("ENTST.SYMB.refs.rls");
        return ["hidden", ""];
      });
      if (!isConfirmed) {
        tgtSelect.value = oldVal;
        State.set("ENTST.SYMB.refs.baseKey", oldVal);
      }
    }
    static addSymb() { State.set("ENTST.SYMB.refs.rls", [...(State.get("ENTST.SYMB.refs.rls") ?? []), { key: `rule_${Date.now()}`, target: "", shp: GLB.symbDefShp, clr: GLB.symbDefClr }]); }
    static removeSymb(tgtBtn, param) {
      const key = param || tgtBtn.dataset.param;
      if (key) State.set("ENTST.SYMB.refs.rls", (State.get("ENTST.SYMB.refs.rls") ?? []).filter(r => r.key !== key));
    }
    static updSymb(tgtBtn, param, subParam) {
      const idx = param || tgtBtn.dataset.param, type = subParam || tgtBtn.dataset.subParam;
      if (idx == null || !type) return;
      const rls = [...(State.get("ENTST.SYMB.refs.rls") ?? [])];
      if (rls[idx]) { rls[idx][type] = tgtBtn.value; State.set("ENTST.SYMB.refs.rls", rls); }
    }
    static async genPrev() {
      await CoreAct.withAsync("ENTST.PREV.status", async () => {
        const { PREV, CALB, ASGN, SYMB } = State.proxy.ENTST;
        const conf = { ...PREV.refs, ...CALB.refs, crctDT: ASGN.data.crctDT, graphType: 'calib', calbVal: PREV.refs.val };
        const { prevDT, statsDT } = CHARTDT.genChartDB(ASGN.data.pxrfDT, ASGN.data.wdxrfDT, conf);
        if (!prevDT.length) throw new Error("対象データなし");
        const chartConfig = {
          data: { prevDT, statsDT },
          symb: SYMB.refs,
          panel: { title: "", xLabel: "WDXRF", yLabel: "pXRF", graphType: "calib" },
          gph: { style: GLB.defGraphStyle, gap: GLB.defGraphGap },
          layout: { aspectMode: 'square' }
        };
        State.set({
          "ENTST.PREV.data.crctLogic": statsDT,
          "ENTST.PREV.data.statsDT": statsDT,
          "ENTST.PREV.data.prevDT": prevDT,
          "ENTST.PREV.data.chartSrc": chartConfig,
          "ENTST.phase": ENT_PHS.PREVIEWED
        });
        return ["message", "データと検量線のプレビュー"];
      });
    }
    static async pushCrct() {
      const idxNm = State.get("ENTST.STDZ.refs.saveIndexName")?.trim();
      if (!idxNm) { State.set("ENTST.STDZ.status", ["error", "名前が未入力です"]); return; }
      const { ASGN, STDZ } = State.proxy.ENTST;
      const hasOriginal = ASGN.data.crctDT?.length > 0;
      const updDT = hasOriginal ? [...ASGN.data.crctDT] : [CoreMethod.Util.genHeader('crct')];
      const dupIdx = updDT.findIndex((r, i) => i > 0 && r[0] === idxNm);
      const isDup = dupIdx > 0;
      const msg = isDup ? `全対象元素の検量線を上書きしますか？\n名前：${idxNm}` : `全対象元素の検量線を出力しますか？\n名前：${idxNm}`;
      await CoreAct.withAsync("ENTST.STDZ.status", msg, async () => {
        const newRow = Mtd.ADP.genCALB(ASGN.data.pxrfDT, ASGN.data.wdxrfDT, STDZ.refs, idxNm);
        let pushData, pushOpts;
        if (isDup) { updDT[dupIdx] = newRow; pushData = updDT; pushOpts = "clear";
        } else { updDT.push(newRow); pushData = hasOriginal ? [newRow] : updDT; pushOpts = hasOriginal ? ["append"] : "clear"; }
        await API.pushDT(ENTAct.ssId, GLB.appShts.crct, pushData, pushOpts);
        State.set({ "ENTST.ASGN.data.crctDT": updDT, "ENTST.STDZ.refs.saveIndexName": "" });
        return `補正値を${isDup ? '上書き' : '保存'}しました`;
      });
    }
    static async pushStdz() {
      await CoreAct.withAsync("ENTST.STDZ.status", "PXRFシートに出力しますか？", async () => {
        const { ASGN, STDZ } = State.proxy.ENTST;
        const outDT = Mtd.ADP.genNewPxrf(ASGN.data.pxrfDT, STDZ.refs.modeMap);
        await API.pushDT(ENTAct.ssId, GLB.appShts.pxrf, outDT, "clear");
        return "PXRFシートの出力を完了しました";
      });
    }
    static renewENTState() {
      const { ASGN, SYMB, PREV, STDZ } = State.proxy.ENTST;
      const baseDT = ASGN.data.pxrfDT;
      if (!baseDT?.length) { State.set({ "ENTST.ASGN.refs.availableItems": [], "ENTST.SYMB.data.src": null }); return; }
      const items = [...new Set(baseDT.map(d => d[GLB.idx.p1]).filter(Boolean))];
      const vals = [...new Set(baseDT.map(d => d[SYMB.refs.baseKey]).filter(Boolean))];
      const targetOpts = [{ val: "", label: "未選択" }, ...vals.map(v => ({ val: v, label: v }))];
      const optsConf = { target: targetOpts, shp: GLB.symbShapes, clr: GLB.symbColors };
      const actsConf = { add: "ENTAct.addSymb", remove: "ENTAct.removeSymb", update: "ENTAct.updSymb" };
      State.set({
        "ENTST.ASGN.refs.availableItems": items,
        "ENTST.PREV.refs.itemMap": PREV.refs.itemMap?.length ? PREV.refs.itemMap : items,
        "ENTST.STDZ.refs.itemMap": STDZ.refs.itemMap?.length ? STDZ.refs.itemMap : items,
        "ENTST.SYMB.data.src": { rls: SYMB.refs.rls, optsConf, actsConf }
      });
    }
  }
  // --- TrcInit ---
  class TrcInit {
    static async start() {
      CoreAct.rootGLB({ CoreAct, ENTAct });
      CoreAct.cfgRslv = () => ({ schemaKey: 'ent', statPath: 'ENTST.PREF.status', schema: ENT_SCHEMA, persistPaths: ENT_SCHEMA.persistPaths });
      const automatorENT = new CoreUI(ENT_SCHEMA, 'ENTST');
      automatorENT.build();
      State.subscribe("ENTST.phase", () => automatorENT.update());
      State.subscribe("ENTST.RAW.flags", () => automatorENT.update());
      State.subscribe("ENTST.EXTR.flags", () => automatorENT.update());
      State.subscribe("GLB.isLocked", () => automatorENT.update());
      State.subscribe(`ENTST.EXTR.refs.${GLB.idx.key1}`, () => ENTAct.valdExtrRefs());
      State.subscribe("ENTST.RAW.data", data => {
        if (data?.[0]) State.set("ENTST.RAW.data.hdrOpts", data[0].map(h => ({ label: h, val: h })));
        else State.set("ENTST.RAW.data.hdrOpts", []);
      });
      State.subscribe("ENTST.ASGN.data.crctDT", data => {
        if (!data) return;
        const opts = [{ label: "新規検量線", val: "new" }, ...data.slice(1).filter(r => r[0]).map(r => ({ label: r[0], val: r[0] }))];
        State.set("ENTST.CALB.data.crctOpts", opts);
      });
      State.subscribe("ENTST.ASGN.data.pxrfDT", () => ENTAct.renewENTState());
      State.subscribe("ENTST.SYMB.refs.baseKey", () => ENTAct.renewENTState());
      State.subscribe("ENTST.SYMB.refs.rls", () => ENTAct.renewENTState());
      const hooks = { onBeforeInit: () => ENTAct.initDB() };
      const ssId = window.__INITIAL_SSID__ || "EXCEL_LOCAL_RUN";
      CoreAct.actvTab('entry');
      const initCfg = CoreAct.cfgRslv('entry');
      await CoreAct.startSession(ssId, false, hooks, initCfg);
    }
  }
```
