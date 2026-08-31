//--- 配布GAS用gsファイル ---
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("OBPLOT1.0")
    .addItem("tracer5i抽出", "showSidebarT1")
    .addItem("検量線・判別図", "showSidebarT2")
    .addToUi();
}
//--- メニュー表示 ---
function showSidebarT1() { OBPLOT_project.showSidebarT1(); }
function showSidebarT2() { OBPLOT_project.showSidebarT2(); }
//--- 共通関数群 ---
function fetchDT(ssId, shtName, qCol, lCol) { return OBPLOT_project.fetchDT(ssId, shtName, qCol, lCol); }
function writeData(ssId, shtName, data, opts) { return OBPLOT_project.writeData(ssId, shtName, data, opts); }
function getReportTemplate() { return OBPLOT_project.getReportTemplate(); }
function getWbState(ssId) { return OBPLOT_project.getWbState(ssId); }
function buildShts(ssId, buildPlan) { return OBPLOT_project.buildShts(ssId, buildPlan); }
