function onOpen() {
  OBPLOT_Lib.onOpen();
}

function showSidebar() {
  OBPLOT_Lib.showSidebar();
}

// 共通関数群（引数 ssId をそのままライブラリ側へ転送）
function fetchDT(ssId, shtName, qCol, lCol) { return OBPLOT_Lib.fetchDT(ssId, shtName, qCol, lCol); }
function writeData(ssId, shtName, data, opts) { return OBPLOT_Lib.writeData(ssId, shtName, data, opts); }
function getReportTemplate() { return OBPLOT_Lib.getReportTemplate(); }
function checkSheets(ssId, reqShts) { return OBPLOT_Lib.checkSheets(ssId, reqShts); }
function createMissingSheets(ssId, missingShts, appHeadsMap) { return OBPLOT_Lib.createMissingSheets(ssId, missingShts, appHeadsMap); }
