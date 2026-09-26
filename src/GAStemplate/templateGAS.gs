//--- 配布GAS用gsファイル ---
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("OBPLOT1.0")
    .addItem("tracer5i抽出", "showSidebarT1")
    .addItem("検量線・標準化", "showSidebarT2")
    .addItem("ダッシュボード", "showSidebarT3")
    .addToUi();
}
//--- メニュー表示 ---
function showSidebarT1() { OBPLOT_project.showSidebarT1(); }
function showSidebarT2() { OBPLOT_project.showSidebarT2(); }
function showSidebarT3() { OBPLOT_project.showSidebarT3(); }
//--- 共通関数群 ---
function fetchDT(ssId, shtName, qCol, lCol) { return OBPLOT_project.fetchDT(ssId, shtName, qCol, lCol); }
function writeData(ssId, shtName, data, opts) { return OBPLOT_project.writeData(ssId, shtName, data, opts); }
function fetchMultiple(ssId, reqs) { return OBPLOT_project.fetchMultiple(ssId, reqs); }
function writeMultiple(ssId, reqs) { return OBPLOT_project.writeMultiple(ssId, reqs); }
function getReportTemplate() { return OBPLOT_project.getReportTemplate(); }
function getWbState(ssId, targetShts) { return OBPLOT_project.getWbState(ssId, targetShts); }
function buildShts(ssId, buildPlan) { return OBPLOT_project.buildShts(ssId, buildPlan); }
