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
  SpreadsheetApp.getUi().createMenu("OBPLOT1.0").addItem("サイドバーを表示", "showSidebar").addToUi();
}
function showSidebar() {
  const tpl = HtmlService.createTemplateFromFile("Sidebar");
  tpl.initialSsId = SpreadsheetApp.getActiveSpreadsheet().getId();
  SpreadsheetApp.getUi().showSidebar(tpl.evaluate().setTitle("OBPLOT1.0").setWidth(300));
}
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

// --- シート存在確認 ---
function checkSheets(ssId, reqShts) {
  return withErr(() => {
    const ss = SpreadsheetApp.openById(ssId);
    const existing = ss.getSheets().map(s => s.getName());
    const found = reqShts.filter(s => existing.includes(s));
    const missing = reqShts.filter(s => !existing.includes(s));
    return ApiResponse.success({ found, missing, ssName: ss.getName() });
  });
}
// --- 不足シート作成 ---
function createMissingSheets(ssId, missingShts, appHeadsMap) {
  return withErr(() => {
    const ss = SpreadsheetApp.openById(ssId);
    missingShts.forEach(name => {
      const sht = ss.insertSheet(name);
      if (appHeadsMap[name] && appHeadsMap[name].length) {
        sht.getRange(1, 1, 1, appHeadsMap[name].length).setValues([appHeadsMap[name]]);
      }
    });
    return ApiResponse.success(true);
  });
}