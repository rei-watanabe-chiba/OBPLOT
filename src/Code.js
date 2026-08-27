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
function setupEnvironment(ssId, orderedShts, valElms, pxrfHdr, filelistHdr) {
  return withErr(() => {
    const ss = SpreadsheetApp.openById(ssId);
    const existingMap = new Map(ss.getSheets().map(s => [s.getName(), s]));
    // 1. 生成・リセットと検証
    orderedShts.forEach(name => {
      let sht = existingMap.get(name);
      if (!sht) {
        sht = ss.insertSheet(name);
        if (name === 'PXRF' || name === '抽出データ') sht.getRange(1, 1, 1, pxrfHdr.length).setValues([pxrfHdr]);
        if (name === 'ファイルリスト') sht.getRange(1, 1, 1, filelistHdr.length).setValues([filelistHdr]);
        existingMap.set(name, sht);
      } else {
        if (name === '抽出データ' || name === 'ファイルリスト') {
          sht.clear();
          if (name === 'ファイルリスト') sht.getRange(1, 1, 1, filelistHdr.length).setValues([filelistHdr]);
        }
        if (name === 'PXRF' || name === 'WDXRF') {
          const hdr = sht.getRange(1, 1, 1, sht.getLastColumn() || 1).getValues()[0];
          if (name === 'PXRF' && JSON.stringify(hdr) !== JSON.stringify(pxrfHdr)) {
            throw new Error(`【検証エラー】\nPXRFシートのヘッダーが規定と異なります。\nGitHub仕様をご確認ください。`);
          }
          if (name === 'WDXRF') {
            const missing = valElms.filter(e => !hdr.includes(e)); // 緩い規制（列順不動、必須元素の有無のみ確認）
            if (missing.length > 0) throw new Error(`【検証エラー】\nWDXRFシートのヘッダーに必須元素 (${missing.join(',')}) が不足しています。`);
          }
        }
      }
    });
    // 2. 並び順の強制
    orderedShts.forEach((name, idx) => {
      const sht = existingMap.get(name);
      if (sht.getIndex() !== idx + 1) { ss.setActiveSheet(sht); ss.moveActiveSheet(idx + 1); }
    });
    // 3. ヘッダーロック (入力規則)
    ['PXRF', 'WDXRF'].forEach(name => {
      const sht = existingMap.get(name);
      const rule = SpreadsheetApp.newDataValidation().requireFormulaSatisfied('=FALSE').setAllowInvalid(false).setHelpText('システム保護: ヘッダー行の編集は禁止されています。').build();
      sht.getRange('1:1').setDataValidation(rule);
    });
    return true;
  });
}