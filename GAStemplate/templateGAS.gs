//--- 配布GAS用gsファイル ---
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("OBPLOT1.0")
    .addItem("データ抽出ツール", "showSidebarT1")
    .addItem("グラフ作成ツール", "showSidebarT2")
    .addToUi();
}
function showSidebarT1() { OBPLOT_Lib.showSidebarT1(); }
function showSidebarT2() { OBPLOT_Lib.showSidebarT2(); }
function fetchDT(ssId, shtName, qCol, lCol) { return OBPLOT_Lib.fetchDT(ssId, shtName, qCol, lCol); }
function writeData(ssId, shtName, data, opts) { return OBPLOT_Lib.writeData(ssId, shtName, data, opts); }
function getReportTemplate() { return OBPLOT_Lib.getReportTemplate(); }
function setupEnvironment(ssId, oShts, valElms, pxrfHdr, flHdr, isForce) { return OBPLOT_Lib.setupEnvironment(ssId, oShts, valElms, pxrfHdr, flHdr, isForce); }
