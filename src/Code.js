// --- gitingestのバイナリエラー回避のため一時的にtxt形式で保存 ---
// --- グローバル変数定義 ---
const FILE_SHEET_NAME = "File";
const FILE_HEADER = ['file', 'mode', 'id', 'sub_id', 'info'];
const RESULTS_SHEET_NAME = "Results";
const FILELIST_SHEET_NAME = "ファイルリスト";
const FILELIST_HEADER = ['file', 'mode', 'id', 'sub_id', 'info', '計測ID'];
const EXTRACT_SHEET_NAME = "抽出データ";
const VALID_MODES = ["mudrock", "obsidian"];
const OBSIDIAN_INDEX_MAP = {
  "Mn":16, "Fe":18, "Rb":24, "Sr":26,"Y":28, "Zr":30, "Nb":32};
const MUDROCK_INDEX_MAP = {
  "Al":18, "Si":20, "P":22, "K":28, "Ca":30, "Ti":32, 
  "Mn":38, "Fe":40, "Rb":56, "Sr":58, "Y":60, "Zr":62, "Nb":64, "Ba":68
};

// --- DTO生成 ---
class ApiResponse {
  static success(payload) { return { success: true, payload }; }
  static error(type, msg) { return { success: false, errorType: type, message: msg }; }
}

// --- 起動時メニュー追加 ---
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("OBPLOT1.0")
    .addItem("サイドバーを表示", "showSidebar")
    .addToUi();
}

// --- 定数設定取得 ---
function getGlobal() {
  try {
    const global = {
      fileSheetName: FILE_SHEET_NAME,
      fileHeader: FILE_HEADER,
      resultsSheetName: RESULTS_SHEET_NAME,
      filelistSheetName: FILELIST_SHEET_NAME,
      filelistHeader: FILELIST_HEADER,
      extractSheetName: EXTRACT_SHEET_NAME,
      validModes: VALID_MODES,
      propFileEdited: "isFileListEdited",
      fileFields: [
        { key: "file", label: "file *必須", required: true },
        { key: "mode", label: "mode *必須", required: true },
        { key: "id", label: "id *必須", required: true },
        { key: "sub_id", label: "sub_id", required: false },
        { key: "info", label: "info", required: false }
      ],
      obsidianIndex : OBSIDIAN_INDEX_MAP,
      mudrockIndex : MUDROCK_INDEX_MAP
    };
    return ApiResponse.success(global);
  } catch (err) {
    return ApiResponse.error("SYSTEM_ERR", err.message);
  }
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
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return ApiResponse.error("SHEET_ERR", `シート「${sheetName}」不在`);
    let data = sheet.getDataRange().getValues();
    // データ検証
    if (data.length <= 1) return ApiResponse.error("DATA_ERR", "データが1行以下");
    if (quotaCol !== null && data[0].length < quotaCol) return ApiResponse.error("DATA_ERR", "データ列不足");
    if (loadCol !== null) data = data.map(row => row.slice(0, loadCol));
    data = JSON.parse(JSON.stringify(data));
    return ApiResponse.success({ data: data, message: `取得: ${data.length} 行` });
  } catch (err) {
    return ApiResponse.error("SYSTEM_ERR", err.message);
  }
}

// --- データ出力 ---
function writeData(sheetName, data, options = "clear") {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const optList = Array.isArray(options) ? options : [options];
    if (!sheet) return ApiResponse.error("SHEET_ERR", `シート「${sheetName}」不在`);
    if (optList.includes("clear")) sheet.clearContents();
    
    // エラー回避で出力
    const numRows = data.length;
    const numCols = data[0].length;
    sheet.getRange(1, 1, numRows, numCols).setValues(data);
    // 条件付き書式の範囲拡張
    if (optList.includes("rule")) {
      const rules = sheet.getConditionalFormatRules();
      if (rules.length > 0) {
        const currentRule = rules[0];
        const newRange = sheet.getRange(1, 1, numRows, numCols);
        const updatedRule = currentRule.copy().setRanges([newRange]).build();
        rules[0] = updatedRule;
        sheet.setConditionalFormatRules(rules);
      }
    }
    return ApiResponse.success("書き出し完了");
  } catch (err) {
    return ApiResponse.error("SYSTEM_ERR", err.message);
  }
}
// --- 編集検知 ---
function onEdit(e) {
  if (!e || !e.source) return;
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== "ファイルリスト") return; 
  // 編集時フラグ
  PropertiesService.getUserProperties().setProperty("isFileListEdited", "true");
}

// --- UserPropertie確認 ---
function checkUserProperty(id) {
  try {
    const props = PropertiesService.getUserProperties();
    const isEdited = props.getProperty(id) === "true";
    return ApiResponse.success(isEdited);
  } catch (err) {
    return ApiResponse.error("SYSTEM_ERR", err.message);
  }
}

// --- UserPropertie消去 ---
function clearUserProperty(id) {
  try {
    PropertiesService.getUserProperties().deleteProperty(id);
    return ApiResponse.success(true);
  } catch (err) {
    return ApiResponse.error("SYSTEM_ERR", err.message);
  }
}