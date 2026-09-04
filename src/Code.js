//--- src/Code.gs ---
// --- DTO定義 ---
class ApiRes {
  static success(pld) { return { success: true, pld: JSON.parse(JSON.stringify(pld)) }; }
  static error(type, msg) { return { success: false, errorType: type, msg }; }
}
const withErr = fn => {
  try { return fn(); } catch (e) { return ApiRes.error("SYSTEM_ERR", e.message); }
};
// --- メニュー追加 (GAS用) ---
function onOpen() {
  SpreadsheetApp.getUi().createMenu("OBPLOT1.0")
    .addItem("tracer5i抽出", "openSidebarENT")
    .addItem("XRF出力", "openSidebarADP")
    .addItem("グラフ出力", "openSidebarDash")
    .addToUi();
}
// --- サイドバーの呼び出し分岐 ---
function openSidebarENT() { openSidebar("entry", "tracer5i抽出ツール", "Tracer5i"); }
function openSidebarADP() { openSidebar("adapter", "簡易プレビュー＆PXRF出力", "Tracer5i"); }
function openSidebarDash() { openSidebar("dash", "グラフ", "Dash"); }

function openSidebar(mode, title, filename) {
  const tpl = HtmlService.createTemplateFromFile(filename);
  tpl.initialSsId = SpreadsheetApp.getActiveSpreadsheet().getId();
  tpl.appMode = mode;
  SpreadsheetApp.getUi().showSidebar(tpl.evaluate().setTitle(`${title}`).setWidth(300));
}
// --- HTMLバインド ---
function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }
// --- シート操作共通 ---
const getSht = (ssId, name) => SpreadsheetApp.openById(ssId).getSheetByName(name);
// --- データ取得 ---
const _fetchDT = (ss, shtName, qCol, lCol) => {
  const sht = ss.getSheetByName(shtName);
  if (!sht) throw new Error(`シート「${shtName}」不在`);
  const rawDT = sht.getDataRange().getValues();
  if (rawDT.length <= 1) throw new Error("データが1行以下");
  if (qCol && rawDT[0].length < qCol) throw new Error("データ列不足"); 
  const data = lCol ? rawDT.map(r => r.slice(0, lCol)) : rawDT; 
  return { data, msg: `取得: ${data.length} 行` };
};
function pullDT(ssId, shtName, qCol = null, lCol = null) {
  return withErr(() => ApiRes.success(_fetchDT(SpreadsheetApp.openById(ssId), shtName, qCol, lCol)));
}
function pullMult(ssId, reqs) {
  return withErr(() => {
    const ss = SpreadsheetApp.openById(ssId);
    return ApiRes.success(reqs.map(req => {
      try { return { success: true, pld: _fetchDT(ss, req.sht, req.qCol, req.lCol) }; }
      catch (e) { return { success: false, msg: e.message }; }
    }));
  });
}
// --- データ出力 ---
const _writeData = (ss, shtName, data, opts) => {
  const sht = ss.getSheetByName(shtName);
  if (!sht) throw new Error(`シート「${shtName}」不在`);
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
  return "書き出し完了";
};
function pushDT(ssId, shtName, data, opts = "clear") {
  return withErr(() => ApiRes.success(_writeData(SpreadsheetApp.openById(ssId), shtName, data, opts)));
}
function pushMult(ssId, reqs) {
  return withErr(() => {
    const ss = SpreadsheetApp.openById(ssId);
    return ApiRes.success(reqs.map(req => {
      try { return { success: true, pld: _writeData(ss, req.sht, req.data, req.opts || "clear") }; }
      catch (e) { return { success: false, msg: e.message }; }
    }));
  });
}
// --- レポートテンプレート取得 ---
function getReportTemplate() { 
  return withErr(() => ApiRes.success(HtmlService.createTemplateFromFile("Report").evaluate().getContent())); 
}
// --- ブック状態取得 ---
function getWbState(ssId, targetShts = []) {
  return withErr(() => {
    const ss = SpreadsheetApp.openById(ssId);
    return ApiRes.success(ss.getSheets().map(s => {
      const name = s.getName();
      if (targetShts.length > 0 && !targetShts.includes(name)) return { name, hdr: [] };
      return { name, hdr: s.getLastColumn() ? s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0] : [] };
    }));
  });
}
// --- シート動的構築とソート ---
function genShts(ssId, buildPlan) {
  return withErr(() => {
    const ss = SpreadsheetApp.openById(ssId);
    const setHdr = (s, hdr, lock) => {
      s.clear();
      if (!hdr?.length) return;
      s.getRange(1, 1, 1, hdr.length).setValues([hdr]);
      if (lock) s.getRange(1, 1, 1, hdr.length).setDataValidations([hdr.map(v => SpreadsheetApp.newDataValidation().requireValueInList([String(v)], false).setAllowInvalid(false).setHelpText('システム保護: 編集禁止').build())]);
    };
    buildPlan.forEach(({ name, hdr, lock, clr, idx }) => {
      let s = ss.getSheetByName(name);
      if (!s) { s = ss.insertSheet(name); clr = true; } 
      if (clr) setHdr(s, hdr, lock);
      if (idx !== undefined && s.getIndex() !== idx + 1) { ss.setActiveSheet(s); ss.moveActiveSheet(idx + 1); }
    });
    return ApiRes.success("構成更新完了");
  });
}