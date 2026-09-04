// infra/build.js
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');
const imgDir = path.join(__dirname, '../image');
const manifestSrc = path.join(__dirname, 'manifest.xml');

if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

// include 置換関数
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
  // GAS固有のスクリプトレットを空文字に置換し、JS内の変数を意図的に空にする
  return result.replace(/<\?=[\s\S]*?\?>/g, ''); 
};

const officeScript = `<script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js" type="text/javascript"></script>`;

// Report.html の処理 (include解決後にエスケープ)
let reportHtml = fs.readFileSync(path.join(srcDir, 'Report.html'), 'utf-8');
reportHtml = processInclude(reportHtml);

const escapedReport = reportHtml
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${')
  .replace(/<\/script>/ig, '<\\/script>');

const injectScript = `<script>window.__REPORT_TEMPLATE__ = \`${escapedReport}\`;<\/script>`;

// Tracer5i.html (Tracer5i.html -> Tracer5i.html)
let tracerHtml = fs.readFileSync(path.join(srcDir, 'Tracer5i.html'), 'utf-8');
tracerHtml = processInclude(tracerHtml);
tracerHtml = tracerHtml.replace('</head>', `${officeScript}\n</head>`);
fs.writeFileSync(path.join(distDir, 'Tracer5i.html'), tracerHtml);

// Dash.html (Dash.html -> Dash.html)
let dashHtml = fs.readFileSync(path.join(srcDir, 'Dash.html'), 'utf-8');
dashHtml = processInclude(dashHtml);
dashHtml = dashHtml.replace('</head>', `${officeScript}\n${injectScript}\n</head>`);
fs.writeFileSync(path.join(distDir, 'Dash.html'), dashHtml);

// Reportはそのまま出力
fs.writeFileSync(path.join(distDir, 'Report.html'), reportHtml);
console.log('Build completed! Tracer5i.html, Dash.html and Report.html generated successfully.');

// --- GitHub Pagesデプロイ用のアセットコピー処理を追加 ---
if (fs.existsSync(imgDir)) {
  const distImgDir = path.join(distDir, 'image');
  if (!fs.existsSync(distImgDir)) fs.mkdirSync(distImgDir, { recursive: true });
  fs.readdirSync(imgDir).forEach(file => {
    fs.copyFileSync(path.join(imgDir, file), path.join(distImgDir, file));
  });
  console.log('[COPY SUCCESS] image/ copied to dist/image/');
}

if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, path.join(distDir, 'manifest.xml'));
  console.log('[COPY SUCCESS] manifest.xml copied to dist/');
}
