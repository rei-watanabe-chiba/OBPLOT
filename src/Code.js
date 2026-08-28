//--- src/Code.gs ---
// --- DTO定義 ---
class ApiResponse {
  static success(payload) { return { success: true, payload: JSON.parse(JSON.stringify(payload)) }; }
  static error(type, msg) { return { success: false, errorType: type, message: msg }; }
}
const withErr = fn => {
  try { return fn(); } catch (e) { return ApiResponse.error("SYSTEM_ERR", e.message); }
};

// --- メニュー追加 (GAS用) ---
function onOpen() {
  SpreadsheetApp.getUi().createMenu("OBPLOT1.0")
    .addItem("データ抽出ツール", "showSidebarT1")
    .addItem("グラフ作成ツール", "showSidebarT2")
    .addToUi();
}
function showSidebarT1() { openSidebar("tab1", "データ抽出ツール"); }
function showSidebarT2() { openSidebar("tab2", "グラフ作成ツール"); }
function openSidebar(mode, title) {
  const tpl = HtmlService.createTemplateFromFile("Sidebar");
  tpl.initialSsId = SpreadsheetApp.getActiveSpreadsheet().getId();
  tpl.appMode = mode;
  SpreadsheetApp.getUi().showSidebar(tpl.evaluate().setTitle(`OBPLOT1.0: ${title}`).setWidth(300));
}

// --- HTMLバインド ---
function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }

// --- シート操作共通 ---
const getSht = (ssId, name) => SpreadsheetApp.openById(ssId).getSheetByName(name);

// --- データ取得 ---
function fetchDT(ssId, shtName, qCol = null, lCol = null) {
  return withErr(() => {
    const sht = getSht(ssId, shtName);
    if (!sht) return ApiResponse.error("SHEET_ERR", `シート「${shtName}」不在`);
    const rawDT = sht.getDataRange().getValues();
    if (rawDT.length <= 1) return ApiResponse.error("DATA_ERR", "データが1行以下");
    if (qCol && rawDT[0].length < qCol) return ApiResponse.error("DATA_ERR", "データ列不足"); 
    const data = lCol ? rawDT.map(r => r.slice(0, lCol)) : rawDT; 
    return ApiResponse.success({ data, message: `取得: ${data.length} 行` });
  });
}

// --- データ出力 ---
function writeData(ssId, shtName, data, opts = "clear") {
  return withErr(() => {
    const sht = getSht(ssId, shtName);
    if (!sht) return ApiResponse.error("SHEET_ERR", `シート「${shtName}」不在`);
    const optArr = [].concat(opts);
    if (optArr.includes("clear")) sht.clearContents(); 
    const sRow = optArr.includes("append") ? (sht.getLastRow() || 1) + 1 : 1;
    sht.getRange(sRow, 1, data.length, data[0].length).setValues(data);
    if (optArr.includes("rule")) { 
      const rls = sht.getConditionalFormatRules();
      if (rls.length) {
        rls[0] = rls[0].copy().setRanges([sht.getRange(1, 1, sht.getLastRow(), data[0].length)]).build();
        sht.setConditionalFormatRules(rls);
      }
    }
    return ApiResponse.success("書き出し完了");
  });
}

// --- レポートテンプレート取得 ---
function getReportTemplate() { return withErr(() => ApiResponse.success(include("Report"))); }

// --- 環境セットアップ ---
function setupEnvironment(ssId, ordShts, valElms, pxrfHdr, flHdr, isForce) {
  return withErr(() => {
    const ss = SpreadsheetApp.openById(ssId);
    const rls = {
      'PXRF': { hdr: pxrfHdr, lock: true, vald: h => JSON.stringify(h) === JSON.stringify(pxrfHdr) ? null : "・PXRFヘッダー不正" },
      'WDXRF': { lock: true, vald: h => { const ms = valElms.filter(e => !h.includes(e)); return ms.length ? `・WDXRF元素不足: ${ms.join(', ')}` : null; } },
      '抽出データ': { hdr: pxrfHdr, clr: true },
      'ファイルリスト': { hdr: flHdr, clr: true }
    };
    const drv = { // GAS操作Driver
      getMap: () => new Map(ss.getSheets().map(s => [s.getName(), s])),
      add: n => ss.insertSheet(n),
      clr: s => s.clear(),
      setHdr: (s, h) => s.getRange(1, 1, 1, h.length).setValues([h]),
      getHdr: s => s.getRange(1, 1, 1, s.getLastColumn() || 1).getValues()[0],
      setPos: (s, i) => { if (s.getIndex() !== i + 1) { ss.setActiveSheet(s); ss.moveActiveSheet(i + 1); } },
      lock: s => s.getRange('1:1').setDataValidation(SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=FALSE').setAllowInvalid(false).setHelpText('システム保護: 編集禁止').build())
    };
    const exMap = drv.getMap(), msShts = ordShts.filter(n => !exMap.has(n));
    if (msShts.length > 0 && !isForce) return ApiResponse.success({ reqConfirm: true, missing: msShts }); // 不足時確認要求
    const errs = ordShts.reduce((acc, n) => {
      const r = rls[n] || {};
      let sht = exMap.get(n);
      if (!sht) {
        sht = drv.add(n);
        if (r.hdr) drv.setHdr(sht, r.hdr);
        exMap.set(n, sht);
      } else {
        if (r.clr) { drv.clr(sht); if (r.hdr) drv.setHdr(sht, r.hdr); }
        if (r.vald) { const err = r.vald(drv.getHdr(sht)); if (err) acc.push(err); }
      }
      return acc;
    }, []);
    if (errs.length > 0) throw new Error(`【検証エラー】\n${errs.join('\n')}\n\nGitHub仕様をご確認ください。`); // 統合エラー送出
    ordShts.forEach((n, i) => drv.setPos(exMap.get(n), i));
    ordShts.forEach(n => { if (rls[n]?.lock) drv.lock(exMap.get(n)); });
    return ApiResponse.success({ reqConfirm: false });
  });
}