// --- DTO定義 ---
class ApiResponse {
  static success(payload) { return { success: true, payload: JSON.parse(JSON.stringify(payload)) }; }
  static error(type, msg) { return { success: false, errorType: type, message: msg }; }
}
// --- エラーラッパー ---
const withErr = fn => {
  try { return fn(); } catch (e) { return ApiResponse.error("SYSTEM_ERR", e.message); }
};
// --- メニュー追加 ---
function onOpen() {
  SpreadsheetApp.getUi().createMenu("OBPLOT1.0").addItem("サイドバーを表示", "showSidebar").addToUi();
}
// --- サイドバー表示 ---
function showSidebar() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createTemplateFromFile("Sidebar").evaluate().setTitle("OBPLOT1.0").setWidth(300));
}
// --- HTML読込 ---
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
// --- シート取得共通 ---
const getSht = name => SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
// --- データ取得 ---
function fetchData(shtName, qCol = null, lCol = null) {
  return withErr(() => {
    const sht = getSht(shtName);
    if (!sht) return ApiResponse.error("SHEET_ERR", `シート「${shtName}」不在`);
    const raw = sht.getDataRange().getValues();
    if (raw.length <= 1) return ApiResponse.error("DATA_ERR", "データが1行以下");
    if (qCol && raw[0].length < qCol) return ApiResponse.error("DATA_ERR", "データ列不足"); // 列数検証
    const data = lCol ? raw.map(r => r.slice(0, lCol)) : raw; // 必要列のみ抽出
    return ApiResponse.success({ data, message: `取得: ${data.length} 行` });
  });
}
// --- データ出力 ---
function writeData(shtName, data, opts = "clear") {
  return withErr(() => {
    const sht = getSht(shtName);
    if (!sht) return ApiResponse.error("SHEET_ERR", `シート「${shtName}」不在`);
    const optArr = [].concat(opts);
    if (optArr.includes("clear")) sht.clearContents(); // 既存消去
    const sRow = optArr.includes("append") ? (sht.getLastRow() || 1) + 1 : 1;
    sht.getRange(sRow, 1, data.length, data[0].length).setValues(data);
    if (optArr.includes("rule")) { // 書式拡張
      const rules = sht.getConditionalFormatRules();
      if (rules.length) {
        rules[0] = rules[0].copy().setRanges([sht.getRange(1, 1, sht.getLastRow(), data[0].length)]).build();
        sht.setConditionalFormatRules(rules);
      }
    }
    return ApiResponse.success("書き出し完了");
  });
}
// --- 編集検知 ---
function onEdit(e) {
  if (e?.source?.getActiveSheet().getName() === "ファイルリスト") PropertiesService.getUserProperties().setProperty("isFileListEdited", "true");
}
// --- Prop確認 ---
function checkUserProperty(key) {
  return withErr(() => ApiResponse.success(PropertiesService.getUserProperties().getProperty(key) === "true"));
}
// --- Prop消去 ---
function clearUserProperty(key) {
  return withErr(() => { PropertiesService.getUserProperties().deleteProperty(key); return ApiResponse.success(true); });
}
// --- Report取得 ---
function getReportTemplate() {
  return withErr(() => ApiResponse.success(include("Report")));
}