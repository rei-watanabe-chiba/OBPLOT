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
    .addItem("tracer5i抽出", "showSidebarT1")
    .addItem("検量線・標準化", "showSidebarT2")
    .addItem("ダッシュボード", "showSidebarT3")
    .addToUi();
}
function showSidebarT1() { openSidebar("tab1", "tracer5i抽出"); }
function showSidebarT2() { openSidebar("tab2", "検量線・標準化"); }
function showSidebarT3() { openSidebar("tab3", "ダッシュボード"); }
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
function getReportTemplate() { 
  return withErr(() => ApiResponse.success(HtmlService.createTemplateFromFile("Report").evaluate().getContent())); 
}
// --- ブック状態取得 ---
function getWbState(ssId) {
  return withErr(() => ApiResponse.success(SpreadsheetApp.openById(ssId).getSheets().map(s => ({
    name: s.getName(), hdr: s.getLastColumn() ? s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0] : []
  }))));
}
// --- シート動的構築とソート ---
function buildShts(ssId, buildPlan) {
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
    return ApiResponse.success("構成更新完了");
  });
}