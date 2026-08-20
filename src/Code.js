// --- DTO ---
class ApiResponse {
  static success(payload) { return { success: true, payload: JSON.parse(JSON.stringify(payload)) }; }
  static error(type, msg) { return { success: false, errorType: type, message: msg }; }
}

// --- エラーハンドリング共通ラッパー ---
const withErrorHandling = (processFn) => {
  try {
    return processFn();
  } catch (err) {
    return ApiResponse.error("SYSTEM_ERR", err.message);
  }
};

// --- 起動時メニュー追加 ---
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("OBPLOT1.0")
    .addItem("サイドバーを表示", "showSidebar")
    .addToUi();
}

// --- サイドバー表示 ---
function showSidebar() {
  const template = HtmlService.createTemplateFromFile("Sidebar");
  const html = template.evaluate()
    .setTitle("OBPLOT1.0")
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

// --- HTML読込 ---
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// --- シートデータ取得 ---
function fetchData(sheetName, quotaCol = null, loadCol = null) {
  return withErrorHandling(() => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return ApiResponse.error("SHEET_ERR", `シート「${sheetName}」不在`);
    // 取得と検証
    const rawData = sheet.getDataRange().getValues();
    if (rawData.length <= 1) return ApiResponse.error("DATA_ERR", "データが1行以下");
    if (quotaCol && rawData[0].length < quotaCol) return ApiResponse.error("DATA_ERR", "データ列不足");
    // 通信エラー回避でstate返却
    const data = loadCol ? rawData.map(row => row.slice(0, loadCol)) : rawData;
    return ApiResponse.success({ data, message: `取得: ${data.length} 行` });
  });
}

// --- データ出力 ---
function writeData(sheetName, data, options = "clear") {
  return withErrorHandling(() => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return ApiResponse.error("SHEET_ERR", `シート「${sheetName}」不在`);
    const opts = [].concat(options);
    // 既存データ削除（オプション）
    if (opts.includes("clear")) sheet.clearContents();
    // 追記機能（オプション）
    const startRow = opts.includes("append") ? (sheet.getLastRow() || 1) + 1 : 1;
    sheet.getRange(startRow, 1, data.length, data[0].length).setValues(data);
    // 条件付き書式拡張（オプション）
    if (opts.includes("rule")) {
      const rules = sheet.getConditionalFormatRules();
      if (rules.length) {
        rules[0] = rules[0].copy().setRanges([sheet.getRange(1, 1, sheet.getLastRow(), data[0].length)]).build();
        sheet.setConditionalFormatRules(rules);
      }
    }
    return ApiResponse.success("書き出し完了");
  });
}

// --- 編集検知 ---
function onEdit(e) {
  if (e?.source?.getActiveSheet().getName() === "ファイルリスト") {
    PropertiesService.getUserProperties().setProperty("isFileListEdited", "true");
  }
}

// --- UserPropertie確認 ---
function checkUserProperty(id) {
  return withErrorHandling(() => ApiResponse.success(PropertiesService.getUserProperties().getProperty(id) === "true"));
}

// --- UserPropertie消去 ---
function clearUserProperty(id) {
  return withErrorHandling(() => {
    PropertiesService.getUserProperties().deleteProperty(id);
    return ApiResponse.success(true);
  });
}

// --- Reportテンプレート文字列取得 ---
function getReportTemplate() {
  return withErrorHandling(() => ApiResponse.success(HtmlService.createHtmlOutputFromFile("Report").getContent()));
}