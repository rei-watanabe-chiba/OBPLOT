const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');

// Base directory configuration
// __dirname is <REPO_ROOT>/.agents/scripts
// Equivalent to 3 dirname levels from file: file -> scripts -> .agents -> REPO_ROOT
const REPO_ROOT = fs.existsSync(path.resolve(__dirname, '../..', 'src'))
  ? path.resolve(__dirname, '../..')
  : path.resolve(__dirname, '../../..');

const TARGET_ROOT = 'src/gas';
const OUTPUT_PATH = path.join(REPO_ROOT, 'docs', 'index', 'symbols.json');
const DOCS_FEATURES_DIR = path.join(REPO_ROOT, 'docs', 'features');
const EXCLUDE_DIRS = new Set(['__pycache__', '.git', 'node_modules']);

/**
 * Recursively collect .js and .html files from directory
 */
function collectFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        results.push(...collectFiles(fullPath));
      }
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) {
        results.push(fullPath);
      }
    }
  }
  return results.sort();
}

/**
 * Find the first meaningful line of a JSDoc block comment immediately
 * preceding the given symbol start line (within 3 lines tolerance).
 * Returns null if no applicable comment is found.
 */
function findLeadingJsDoc(comments, symbolStartLine) {
  const candidates = comments.filter(
    c => c.loc.line < symbolStartLine && symbolStartLine - c.loc.line <= 3
  );
  if (candidates.length === 0) return null;
  const nearest = candidates[candidates.length - 1];
  const firstMeaningLine = nearest.text
    .split('\n')
    .map(l => l.replace(/^\s*\*\s?/, '').trim())
    .find(l => l && !l.startsWith('@'));
  return firstMeaningLine || null;
}

/**
 * Parse symbols from JavaScript code using acorn and acorn-walk
 */
function parseSymbolsFromCode(code, lineOffset = 0) {
  const symbols = [];
  const comments = [];
  const onComment = (isBlock, text, _s, _e, locStart) => {
    if (isBlock && text.startsWith('*')) {
      comments.push({ loc: locStart, text: text.trim() });
    }
  };
  let ast;
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      onComment
    });
  } catch (errModule) {
    try {
      ast = acorn.parse(code, {
        ecmaVersion: 'latest',
        sourceType: 'script',
        locations: true,
        onComment
      });
    } catch (errScript) {
      return symbols;
    }
  }

  walk.simple(ast, {
    FunctionDeclaration(node) {
      if (node.id && node.id.name) {
        symbols.push({
          name: node.id.name,
          kind: 'function',
          start_line: node.loc.start.line + lineOffset,
          end_line: node.loc.end.line + lineOffset,
          docstring: findLeadingJsDoc(comments, node.loc.start.line)
        });
      }
    },
    VariableDeclarator(node) {
      if (
        node.id &&
        node.id.type === 'Identifier' &&
        node.init &&
        (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')
      ) {
        symbols.push({
          name: node.id.name,
          kind: 'function',
          start_line: node.loc.start.line + lineOffset,
          end_line: node.loc.end.line + lineOffset,
          docstring: findLeadingJsDoc(comments, node.loc.start.line)
        });
      }
    },
    ClassDeclaration(node) {
      if (node.id && node.id.name) {
        symbols.push({
          name: node.id.name,
          kind: 'class',
          start_line: node.loc.start.line + lineOffset,
          end_line: node.loc.end.line + lineOffset,
          docstring: findLeadingJsDoc(comments, node.loc.start.line)
        });
      }
    },
    MethodDefinition(node) {
      let name = '';
      if (node.key) {
        if (node.key.type === 'Identifier' || node.key.type === 'PrivateIdentifier') {
          name = node.key.name;
        } else if (node.key.type === 'Literal') {
          name = String(node.key.value);
        }
      }
      if (name) {
        symbols.push({
          name: name,
          kind: 'method',
          start_line: node.loc.start.line + lineOffset,
          end_line: node.loc.end.line + lineOffset,
          docstring: findLeadingJsDoc(comments, node.loc.start.line)
        });
      }
    }
  });

  return symbols;
}

/**
 * Extract symbols from a given file (.js or .html)
 */
function extractSymbols(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const symbols = [];

  if (filePath.endsWith('.js')) {
    symbols.push(...parseSymbolsFromCode(content, 0));
  } else if (filePath.endsWith('.html')) {
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptRegex.exec(content)) !== null) {
      const scriptCode = match[1];
      if (!scriptCode.trim()) {
        continue;
      }
      const preMatch = content.slice(0, match.index);
      const lineOffset = (preMatch.match(/\n/g) || []).length;
      symbols.push(...parseSymbolsFromCode(scriptCode, lineOffset));
    }
  }

  symbols.sort((a, b) => a.start_line - b.start_line || b.end_line - a.end_line);
  return { symbols };
}

/**
 * Build index for all files under TARGET_ROOT
 */
function buildIndex() {
  // Load existing index to preserve manually-written docstrings
  let existingFiles = {};
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      existingFiles = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8')).files || {};
    } catch (_) {}
  }

  const absTarget = path.join(REPO_ROOT, TARGET_ROOT);
  const files = collectFiles(absTarget);
  const filesOut = {};

  for (const filePath of files) {
    const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    const extracted = extractSymbols(filePath);
    const existingSymbols = (existingFiles[rel] && existingFiles[rel].symbols) || [];

    // Merge: preserve existing non-null docstring if start_line matches
    extracted.symbols = extracted.symbols.map(sym => {
      if (sym.docstring != null) return sym;
      const existing = existingSymbols.find(
        e => e.name === sym.name && e.start_line === sym.start_line
      );
      return { ...sym, docstring: (existing && existing.docstring) || null };
    });

    filesOut[rel] = extracted;
  }

  return {
    generated_at: new Date().toISOString(),
    root: TARGET_ROOT,
    files: filesOut
  };
}

/**
 * Write index to symbols.json
 */
function writeIndex(index) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8');
}

// --- --sync-doc-frontmatter -------------------------------------------------

function parseRelatedFiles(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  let inRelated = false;
  const files = [];
  for (const line of lines) {
    if (/^related_files:\s*$/.test(line)) {
      inRelated = true;
      continue;
    }
    if (inRelated) {
      if (/^[ \t]*-[ \t]*/.test(line)) {
        files.push(line.replace(/^[ \t]*-[ \t]*/, '').trim());
      } else if (/^\S/.test(line)) {
        break;
      }
    }
  }
  return files;
}

function buildKeySymbolsBlock(relatedFiles, index) {
  const out = ['key_symbols:  # auto-generated by build_symbols_index.js --sync-doc-frontmatter -- do not hand-edit'];
  for (const rel of relatedFiles) {
    const entry = index.files && index.files[rel];
    if (!entry || !entry.symbols) {
      continue;
    }
    const names = entry.symbols.map(s => s.name);
    out.push(`  ${rel}: [${names.join(', ')}]`);
  }
  return out.join('\n') + '\n';
}

function updateFrontmatter(frontmatter, newBlock) {
  const lines = frontmatter.split(/\r?\n/);
  let startIndex = -1;
  let endIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^key_symbols:/.test(lines[i])) {
      startIndex = i;
      break;
    }
  }
  if (startIndex !== -1) {
    endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i++) {
      if (/^\S/.test(lines[i])) {
        endIndex = i;
        break;
      }
    }
    const newBlockLines = newBlock.trimEnd().split(/\r?\n/);
    lines.splice(startIndex, endIndex - startIndex, ...newBlockLines);
    return lines.join('\n');
  } else {
    return frontmatter.trimEnd() + '\n' + newBlock.trimEnd() + '\n';
  }
}

function syncDocFrontmatter(docPath, index, dryRun = false) {
  const text = fs.readFileSync(docPath, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    console.log(`skip (no frontmatter): ${docPath}`);
    return false;
  }
  const frontmatter = match[1];
  const related = parseRelatedFiles(frontmatter);
  if (related.length === 0) {
    console.log(`skip (no related_files): ${docPath}`);
    return false;
  }
  const newBlock = buildKeySymbolsBlock(related, index);
  const newFrontmatter = updateFrontmatter(frontmatter, newBlock);
  const newText = `---\n${newFrontmatter}---\n` + text.slice(match[0].length);

  if (dryRun) {
    console.log(`--- would update ${docPath} ---\n${newBlock}`);
  } else {
    fs.writeFileSync(docPath, newText, 'utf8');
    console.log(`updated ${docPath}`);
  }
  return true;
}

function main() {
  const index = buildIndex();
  writeIndex(index);
  console.log(`wrote ${Object.keys(index.files).length} files -> ${OUTPUT_PATH}`);

  if (process.argv.includes('--sync-doc-frontmatter')) {
    const dryRun = process.argv.includes('--dry-run');
    function syncAllDocs(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) syncAllDocs(path.join(dir, entry.name));
        else if (entry.name.endsWith('.md')) syncDocFrontmatter(path.join(dir, entry.name), index, dryRun);
      }
    }
    syncAllDocs(DOCS_FEATURES_DIR);
  }
}

main();
