// --- Global ---
const FILE_SHEET_NAME = "File";
const FILE_HEADER = ['file', 'mode', 'id', 'sub_id', 'info'];
const RESULTS_SHEET_NAME = "Results";
const FILELIST_SHEET_NAME = "ファイルリスト";
const FILELIST_HEADER = ['file', 'mode', 'id', 'sub_id', 'info', '計測ID'];
const EXTRACT_SHEET_NAME = "抽出データ";
const PXRF_SHEET_NAME = "PXRF";
const VALID_MODES = ["mudrock", "obsidian"];
const OBSIDIAN_INDEX_MAP = { "Mn":16, "Fe":18, "Rb":24, "Sr":26,"Y":28, "Zr":30, "Nb":32 };
const MUDROCK_INDEX_MAP = { "Al":18, "Si":20, "P":22, "K":28, "Ca":30, "Ti":32, "Mn":38, "Fe":40, "Rb":56, "Sr":58, "Y":60, "Zr":62, "Nb":64, "Ba":68 };

// --- DTO生成 ---
class ApiResponse {
  static success(payload) { return { success: true, payload }; }
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

// --- 定数設定取得 ---
function getGlobal() {
  return withErrorHandling(() => ApiResponse.success({
    fileSheetName: FILE_SHEET_NAME,
    fileHeader: FILE_HEADER,
    resultsSheetName: RESULTS_SHEET_NAME,
    filelistSheetName: FILELIST_SHEET_NAME,
    filelistHeader: FILELIST_HEADER,
    extractSheetName: EXTRACT_SHEET_NAME,
    pxrfSheetName: PXRF_SHEET_NAME,
    validModes: VALID_MODES,
    propFileEdited: "isFileListEdited",
    fileFields: [
      { key: "file", label: "file *必須", required: true },
      { key: "mode", label: "mode *必須", required: true },
      { key: "id", label: "id *必須", required: true },
      { key: "sub_id", label: "sub_id", required: false },
      { key: "info", label: "info", required: false }
    ],
    obsidianIndex: OBSIDIAN_INDEX_MAP,
    mudrockIndex: MUDROCK_INDEX_MAP
  }));
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
    if (quotaCol !== null && rawData[0].length < quotaCol) return ApiResponse.error("DATA_ERR", "データ列不足");
    const data = loadCol !== null ? rawData.map(row => row.slice(0, loadCol)) : rawData;
    // 通信エラー防止
    return ApiResponse.success({ data: JSON.parse(JSON.stringify(data)), message: `取得: ${data.length} 行` });
  });
}

// --- データ出力 ---
function writeData(sheetName, data, options = "clear") {
  return withErrorHandling(() => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return ApiResponse.error("SHEET_ERR", `シート「${sheetName}」不在`);
    const [numRows, numCols] = [data.length, data[0].length];
    const opts = Array.isArray(options) ? options : [options];
    // clearオプション：全消し
    if (opts.includes("clear")) sheet.clearContents();
    // appendオプション：末尾追加
    const startRow = opts.includes("append") ? (sheet.getLastRow() || 1) + 1 : 1;
    sheet.getRange(startRow, 1, numRows, numCols).setValues(data);
    // ruleオプション：条件付き書式拡張
    if (opts.includes("rule")) {
      const rules = sheet.getConditionalFormatRules();
      if (rules.length > 0) {
        rules[0] = rules[0].copy().setRanges([sheet.getRange(1, 1, sheet.getLastRow(), numCols)]).build();
        sheet.setConditionalFormatRules(rules);
      }
    }
    return ApiResponse.success("書き出し完了");
  });
}

// --- 編集検知 ---
function onEdit(e) {
  if (e?.source?.getActiveSheet().getName() === FILELIST_SHEET_NAME) {
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