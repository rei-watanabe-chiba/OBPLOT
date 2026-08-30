const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

// Sidebar.html と Report.html の共通 include 置換関数
const processInclude = (htmlStr) => {
  let result = htmlStr.replace(/<\?!= include\(['"]([^'"]+)['"]\); \?>/g, (match, fileName) => {
    const exts = ['.html', '.js'];
    for (const ext of exts) {
      const filePath = path.join(srcDir, fileName.endsWith(ext) ? fileName : fileName + ext);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log(`[INCLUDE SUCCESS] ${fileName} -> 結合完了`);
        return filePath.endsWith('.js') ? `<script>\n${content}\n</script>` : content;
      }
    }
    console.warn(`[WARN] File not found: ${fileName}`);
    return '';
  });
  return result.replace(/<\?=[\s\S]*?\?>/g, ''); // GAS固有のスクリプトレットを削除
};

let sidebarHtml = fs.readFileSync(path.join(srcDir, 'Sidebar.html'), 'utf-8');
sidebarHtml = processInclude(sidebarHtml);

// Excel環境（App.html）の時だけ office.js を自動注入
const officeScript = `<script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js" type="text/javascript"></script>`;
sidebarHtml = sidebarHtml.replace('</head>', `${officeScript}\n</head>`);

// Report.html の処理 (include解決後にエスケープ)
let reportHtml = fs.readFileSync(path.join(srcDir, 'Report.html'), 'utf-8');
reportHtml = processInclude(reportHtml);

const escapedReport = reportHtml
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${')
  .replace(/<\/script>/ig, '<\\/script>');

const injectScript = `<script>window.__REPORT_TEMPLATE__ = \`${escapedReport}\`;<\/script>`;
sidebarHtml = sidebarHtml.replace('</head>', `${injectScript}</head>`);

fs.writeFileSync(path.join(distDir, 'App.html'), sidebarHtml);
fs.writeFileSync(path.join(distDir, 'Report.html'), reportHtml);
console.log('Build completed! App.html and Report.html generated successfully.');
