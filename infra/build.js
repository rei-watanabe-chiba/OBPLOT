const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

let sidebarHtml = fs.readFileSync(path.join(srcDir, 'Sidebar.html'), 'utf-8');

// include関数の静的置換（.html と .js に対応）
sidebarHtml = sidebarHtml.replace(/<\?!= include\(['"]([^'"]+)['"]\); \?>/g, (match, fileName) => {
  const exts = ['.html', '.js'];
  for (const ext of exts) {
    const filePath = path.join(srcDir, fileName.endsWith(ext) ? fileName : fileName + ext);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return filePath.endsWith('.js') ? `<script>\n${content}\n</script>` : content;
    }
  }
  console.warn(`[WARN] File not found: ${fileName}`);
  return '';
});

// GAS固有のスクリプトレット(<?= ... ?>)を静的HTML用に空文字に置換
sidebarHtml = sidebarHtml.replace(/<\?=[\s\S]*?\?>/g, '');

// 別タブレポートの定数化と注入（※終了タグのエスケープ処理を追加）
const reportHtml = fs.readFileSync(path.join(srcDir, 'Report.html'), 'utf-8');
const escapedReport = reportHtml
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${')
  .replace(/<\/script>/ig, '<\\/script>'); // ブラウザパーサーの誤認防止

const injectScript = `<script>window.__REPORT_TEMPLATE__ = \`${escapedReport}\`;<\/script>`;
sidebarHtml = sidebarHtml.replace('</head>', `${injectScript}</head>`);

fs.writeFileSync(path.join(distDir, 'App.html'), sidebarHtml);
fs.writeFileSync(path.join(distDir, 'Report.html'), reportHtml);
console.log('Build completed! App.html and Report.html generated successfully.');
