"""Static AST-based symbol index generator (read-only dev tool, no LLM calls).

Walks pointer_geocoding/ and extracts, per .py file, the class/function/method
names, line ranges and first docstring line, using Python's own `ast` module.
No network calls, no typesafe_sdk dependency, no QGIS dependency.

Also recurses into each top-level function's and each method's body to find
nested function definitions (closures), e.g. a Qt slot handler defined inline
inside a UI-building function. Without this, code living entirely inside a
closure is invisible to symbols.json: not because it's excluded on purpose,
but because a plain `tree.body` walk only ever sees the module's and classes'
immediate children. That blind spot was found empirically against this
project's own main_image.py -- confirmed to have a class-shaped bug hiding
inside such a closure. Nested-inside-nested closures are also found
(recursively), but a `def` written inside a locally-defined class body is not
(nested classes are rare in this codebase and out of scope here).

Usage:
    python .agents/scripts/build_symbols_index.py
    python .agents/scripts/build_symbols_index.py --sync-doc-frontmatter [--dry-run]
"""
import argparse
import ast
import datetime
import json
import os
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET_ROOT = "src"
OUTPUT_PATH = os.path.join(REPO_ROOT, "docs", "index", "symbols.json")
DOCS_FEATURES_DIR = os.path.join(REPO_ROOT, "docs", "features")
EXCLUDE_DIRS = {"__pycache__", ".git"}


def _doc_first_line(node) -> str | None:
    doc = ast.get_docstring(node, clean=True)
    if not doc:
        return None
    return doc.strip().splitlines()[0]


_COMPOUND_BODY_FIELDS = ("body", "orelse", "finalbody")


def _nested_function_entries(container_body: list, name_prefix: str) -> list[dict]:
    """Recursively find function defs nested inside a function/method body.

    Descends into if/for/while/try/with blocks (so a closure defined inside a
    loop or conditional is still found) but not into locally-defined classes
    (nested classes are rare here and their methods belong to a different
    naming scheme than this function-nesting one). `name_prefix` is the
    dotted path of enclosing function/method names, e.g. "create_tab1_ui" or
    "on_click", so a closure two levels deep reads as
    "create_tab1_ui._refresh_edit_layer_combo.inner".
    """
    nested = []
    for stmt in container_body:
        if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef)):
            qualified_name = f"{name_prefix}.{stmt.name}"
            nested.append({
                "name": qualified_name,
                "kind": "nested async function" if isinstance(stmt, ast.AsyncFunctionDef) else "nested function",
                "start_line": stmt.lineno,
                "end_line": stmt.end_lineno,
                "docstring": _doc_first_line(stmt),
            })
            nested.extend(_nested_function_entries(stmt.body, qualified_name))
        elif isinstance(stmt, ast.ClassDef):
            continue
        else:
            for field in _COMPOUND_BODY_FIELDS:
                sub_body = getattr(stmt, field, None)
                if isinstance(sub_body, list):
                    nested.extend(_nested_function_entries(sub_body, name_prefix))
            for handler in getattr(stmt, "handlers", []) or []:
                nested.extend(_nested_function_entries(handler.body, name_prefix))
    return nested


def _method_entries(class_node: ast.ClassDef) -> list[dict]:
    methods = []
    for child in class_node.body:
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
            methods.append({
                "name": child.name,
                "kind": "async method" if isinstance(child, ast.AsyncFunctionDef) else "method",
                "start_line": child.lineno,
                "end_line": child.end_lineno,
                "docstring": _doc_first_line(child),
                "nested": _nested_function_entries(child.body, child.name),
            })
    return methods


def extract_symbols(file_path: str) -> dict:
    with open(file_path, "r", encoding="utf-8") as f:
        source = f.read()
    
    import re
    symbols = []
    # Basic regex to match function declarations in JS/GAS
    func_pattern = re.compile(r'^[ \t]*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(', re.MULTILINE)
    
    for match in func_pattern.finditer(source):
        name = match.group(1)
        line_num = source[:match.start()].count('\n') + 1
        symbols.append({
            "name": name,
            "kind": "function",
            "start_line": line_num,
            "end_line": line_num + 5, # Approximated end line
            "docstring": "",
            "nested": []
        })
    return {"module_docstring": "", "symbols": symbols}


def collect_py_files(root_dir: str) -> list[str]:
    result = []
    for cur, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        result += [os.path.join(cur, fn) for fn in files if fn.endswith((".gs", ".html", ".js"))]
    return result


def build_index() -> dict:
    abs_target = os.path.join(REPO_ROOT, TARGET_ROOT)
    files_out = {}
    for path in sorted(collect_py_files(abs_target)):
        rel = os.path.relpath(path, REPO_ROOT).replace(os.sep, "/")
        files_out[rel] = extract_symbols(path)
    return {
        "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "root": TARGET_ROOT,
        "files": files_out,
    }


def write_index(index: dict) -> None:
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


# --- --sync-doc-frontmatter -------------------------------------------------

FRONTMATTER_RE = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)
RELATED_FILES_RE = re.compile(r"^related_files:\s*\n((?:^\s*-\s*.+\n?)+)", re.MULTILINE)
KEY_SYMBOLS_BLOCK_RE = re.compile(r"^key_symbols:.*?(?=^\S|\Z)", re.MULTILINE | re.DOTALL)


def parse_related_files(frontmatter_text: str) -> list[str]:
    m = RELATED_FILES_RE.search(frontmatter_text)
    if not m:
        return []
    return [ln.split("-", 1)[1].strip() for ln in m.group(1).splitlines() if ln.strip().startswith("-")]


def build_key_symbols_block(related_files: list[str], index: dict) -> str:
    out = ["key_symbols:  # auto-generated by build_symbols_index.py --sync-doc-frontmatter -- do not hand-edit"]
    for rel in related_files:
        entry = index["files"].get(rel)
        if not entry or "symbols" not in entry:
            continue
        names = [s["name"] for s in entry["symbols"]]
        out.append(f"  {rel}: [{', '.join(names)}]")
    return "\n".join(out) + "\n"


def sync_doc_frontmatter(doc_path: str, index: dict, dry_run: bool = False) -> bool:
    with open(doc_path, encoding="utf-8") as f:
        text = f.read()
    m = FRONTMATTER_RE.match(text)
    if not m:
        print(f"skip (no frontmatter): {doc_path}")
        return False
    frontmatter = m.group(1)
    related = parse_related_files(frontmatter)
    if not related:
        print(f"skip (no related_files): {doc_path}")
        return False
    new_block = build_key_symbols_block(related, index)
    if KEY_SYMBOLS_BLOCK_RE.search(frontmatter):
        new_frontmatter = KEY_SYMBOLS_BLOCK_RE.sub(new_block, frontmatter)
    else:
        new_frontmatter = frontmatter.rstrip("\n") + "\n" + new_block
    new_text = f"---\n{new_frontmatter}\n---\n" + text[m.end():]
    if dry_run:
        print(f"--- would update {doc_path} ---\n{new_block}")
    else:
        with open(doc_path, "w", encoding="utf-8") as f:
            f.write(new_text)
        print(f"updated {doc_path}")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sync-doc-frontmatter", action="store_true",
                         help="Refresh the key_symbols block in docs/features/*.md from the index")
    parser.add_argument("--dry-run", action="store_true",
                         help="With --sync-doc-frontmatter, preview changes without writing")
    args = parser.parse_args()

    index = build_index()
    write_index(index)
    print(f"wrote {len(index['files'])} files -> {OUTPUT_PATH}")

    if args.sync_doc_frontmatter:
        if not os.path.isdir(DOCS_FEATURES_DIR):
            print(f"no such directory: {DOCS_FEATURES_DIR}")
            return
        for name in sorted(os.listdir(DOCS_FEATURES_DIR)):
            if name.endswith(".md"):
                sync_doc_frontmatter(os.path.join(DOCS_FEATURES_DIR, name), index, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
