"""MCP server exposing TypeSafe AI's Jev (System One) model as a triage tool.

Wraps the official `typesafe_sdk` directly (no third-party MCP wrapper).
Exposes four tools, all built on `Choice` (relative ranking over a batch of
labels; `typesafe_sdk` has no free-text generation primitive). `Choice` caps
at 255 labels per call (see `CHOICE_BATCH_SIZE` below), so candidates are
batched and results are merged/sorted across batches -- note probabilities
are only normalized within a batch, so cross-batch comparison is an
approximation shared by all four tools below.

- `search_relevant_files_jev` (explorer): file-level triage. Ranks candidate
  files under a directory against a task description. Returns a JSON array
  of {file, probability}, sorted by probability descending.
- `search_relevant_symbols_jev` (explorer): ranks known symbols from
  `docs/index/symbols.json` (built by `.claude/scripts/build_symbols_index.py`)
  against a task description, for cases where a plain Grep over that index
  doesn't match a vague/abstract task.
- `search_relevant_lines_jev` (explorer): within a single already-identified
  file (and optionally a line range, e.g. a large symbol from the tool
  above), splits the range into fixed-size line windows and ranks them. This
  is the fallback for when a symbol's own range is still too coarse to
  localize further (e.g. a 400-line function) without reading the whole thing.
- `search_scope_violations_jev` (verifier): splits a unified diff (e.g. from
  `git diff`) into per-hunk chunks and ranks them by relevance to the task
  description, ascending (least relevant first). Low-relevance hunks are
  out-of-scope-change *candidates* for the verifier to inspect manually --
  this tool screens, it does not itself decide scope violations.
"""

import ast
import sys
import json
import os
import asyncio
import datetime

# Windows defaults stdin to the console's ANSI codepage; force UTF-8 so
# non-ASCII task text isn't silently mis-decoded (mojibake) over JSON-RPC.
sys.stdin.reconfigure(encoding="utf-8")

# Redirect standard output to standard error to prevent prints from breaking the JSON-RPC protocol
real_stdout = sys.stdout
sys.stdout = sys.stderr

from typesafe_sdk import AsyncTypeSafeClient, Choice

# Prune vendored/VCS/cache dirs so a scan never walks Lib/site-packages
# (which would turn a few file checks into hundreds of Jev API calls).
EXCLUDE_DIRS = {"Lib", "lib", "Scripts", "__pycache__", ".git", ".venv", "venv", "node_modules", "dist", "build"}

TARGET_EXTENSIONS = (".gs", ".html", ".js", ".md", ".json", ".txt", ".csv")

# Conservative cap on concurrent in-flight Jev requests (no documented rate
# limit to derive this from; the SDK retries 429s on top of this).
MAX_CONCURRENCY = 8

# Repo-root-relative path to the static symbol index built by
# .claude/scripts/build_symbols_index.py.
SYMBOLS_INDEX_PATH = os.path.join("docs", "index", "symbols.json")

# `Choice.criteria` accepts at most 255 labels per call; batch under that.
CHOICE_BATCH_SIZE = 200


def _doc_first_line(node) -> str | None:
    doc = ast.get_docstring(node, clean=True)
    if not doc:
        return None
    return doc.strip().splitlines()[0]


def _raw_snippet(source: str, max_lines: int = 100) -> str:
    lines = source.splitlines(keepends=True)
    return "".join(lines[:max_lines])


def _summarize_python(source: str, filename: str) -> str | None:
    # AST summary instead of a raw head-of-file snippet, so Jev can "see"
    # classes/functions past line 100 without sending the whole file.
    try:
        tree = ast.parse(source, filename=filename)
    except SyntaxError:
        return None

    lines = []
    mod_doc = _doc_first_line(tree)
    if mod_doc:
        lines.append(f"MODULE DOCSTRING: {mod_doc}")

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            doc = _doc_first_line(node)
            suffix = f": {doc}" if doc else ""
            lines.append(f"class {node.name} (L{node.lineno}-{node.end_lineno}){suffix}")
            for sub in node.body:
                if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    sdoc = _doc_first_line(sub)
                    ssuffix = f": {sdoc}" if sdoc else ""
                    kind = "async def" if isinstance(sub, ast.AsyncFunctionDef) else "def"
                    lines.append(f"    {kind} {sub.name} (L{sub.lineno}-{sub.end_lineno}){ssuffix}")
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            doc = _doc_first_line(node)
            suffix = f": {doc}" if doc else ""
            kind = "async def" if isinstance(node, ast.AsyncFunctionDef) else "def"
            lines.append(f"{kind} {node.name} (L{node.lineno}-{node.end_lineno}){suffix}")

    return "\n".join(lines) if lines else None


def _summarize_markdown(source: str) -> str | None:
    headings = [ln.strip() for ln in source.splitlines() if ln.lstrip().startswith("#")]
    return "\n".join(headings) if headings else None


def build_content_for_jev(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    with open(path, "r", encoding="utf-8") as f:
        source = f.read()

    if ext == ".py":
        summary = _summarize_python(source, path)
        return summary if summary is not None else _raw_snippet(source)
    if ext == ".md":
        summary = _summarize_markdown(source)
        return summary if summary is not None else _raw_snippet(source)
    return _raw_snippet(source)


def collect_target_files(directory: str) -> list[str]:
    directory = os.path.normpath(directory)
    target_files = []
    if not os.path.isdir(directory):
        return target_files
    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            if file.endswith(TARGET_EXTENSIONS):
                target_files.append(os.path.join(root, file))
    return target_files


def _chunk(items: list, size: int) -> list[list]:
    return [items[i:i + size] for i in range(0, len(items), size)]


async def evaluate_files_with_jev(task_description: str, file_paths: list[str], top_k: int = 20) -> list[dict]:
    # Build content up front (I/O-bound, cheap) so a bad file never costs a Jev call.
    contents: dict[str, str] = {}
    for path in file_paths:
        if not os.path.isfile(path):
            continue
        try:
            content = build_content_for_jev(path)
        except Exception:
            continue
        if content.strip():
            contents[path] = content

    candidate_paths = list(contents.keys())
    if not candidate_paths:
        return []

    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    batches = _chunk(candidate_paths, CHOICE_BATCH_SIZE)

    async with AsyncTypeSafeClient() as client:

        async def rank_batch(batch: list[str]) -> list[dict]:
            criteria = {str(idx): f"{p}\n{contents[p]}" for idx, p in enumerate(batch)}
            try:
                async with sem:
                    response = await client.system_one(
                        state=f"【Task】\n{task_description}",
                        questions={
                            "relevant_file": Choice(
                                instructions="Which of these files is most relevant and necessary for completing or implementing the specified task?",
                                criteria=criteria,
                            )
                        },
                    )
                probabilities = response.answers["relevant_file"].probabilities
            except Exception:
                return []
            return [{"file": batch[int(idx)], "probability": prob} for idx, prob in probabilities.items()]

        batch_results = await asyncio.gather(*(rank_batch(b) for b in batches))

    ranked = [item for batch in batch_results for item in batch]
    ranked.sort(key=lambda item: item["probability"], reverse=True)
    return ranked[:top_k] if top_k else ranked


def _normalize_rel_path(path: str) -> str:
    # symbols.json keys are repo-root-relative, forward-slashed; normalize
    # incoming paths (absolute/backslashed/relative) to the same shape.
    abs_path = os.path.abspath(path)
    rel = os.path.relpath(abs_path, _REPO_ROOT)
    return rel.replace(os.sep, "/")


def load_symbols_index(index_path: str) -> dict:
    if not os.path.isfile(index_path):
        return {}
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def flatten_symbols(index: dict, file_filter: list[str] | None = None) -> list[dict]:
    # One entry per class/function/method, carrying enough context (file,
    # line range, docstring) for a Choice label without re-reading the file.
    allowed = {_normalize_rel_path(p) for p in file_filter} if file_filter else None

    flattened = []
    for rel_path, entry in index.get("files", {}).items():
        if allowed is not None and rel_path not in allowed:
            continue
        for sym in entry.get("symbols", []):
            flattened.append({
                "file": rel_path,
                "name": sym["name"],
                "kind": sym["kind"],
                "start_line": sym["start_line"],
                "end_line": sym["end_line"],
                "docstring": sym.get("docstring"),
            })
            # Closures nested in a top-level function; `name` is already
            # dotted (e.g. "create_tab1_ui._refresh_edit_layer_combo").
            for nested in sym.get("nested", []):
                flattened.append({
                    "file": rel_path,
                    "name": nested["name"],
                    "kind": nested["kind"],
                    "start_line": nested["start_line"],
                    "end_line": nested["end_line"],
                    "docstring": nested.get("docstring"),
                })
            for method in sym.get("methods", []):
                flattened.append({
                    "file": rel_path,
                    "name": f"{sym['name']}.{method['name']}",
                    "kind": method["kind"],
                    "start_line": method["start_line"],
                    "end_line": method["end_line"],
                    "docstring": method.get("docstring"),
                })
                # Closures nested in a method; prefix with the class name.
                for nested in method.get("nested", []):
                    flattened.append({
                        "file": rel_path,
                        "name": f"{sym['name']}.{nested['name']}",
                        "kind": nested["kind"],
                        "start_line": nested["start_line"],
                        "end_line": nested["end_line"],
                        "docstring": nested.get("docstring"),
                    })
    return flattened


async def evaluate_symbols_with_jev(task_description: str, symbols: list[dict], top_k: int = 15) -> list[dict]:
    if not symbols:
        return []

    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    batches = _chunk(symbols, CHOICE_BATCH_SIZE)

    async with AsyncTypeSafeClient() as client:

        async def rank_batch(batch: list[dict]) -> list[dict]:
            criteria = {}
            for idx, sym in enumerate(batch):
                doc = f": {sym['docstring']}" if sym["docstring"] else ""
                criteria[str(idx)] = f"{sym['kind']} {sym['name']} in {sym['file']} (L{sym['start_line']}-{sym['end_line']}){doc}"
            try:
                async with sem:
                    response = await client.system_one(
                        state=f"【Task】\n{task_description}",
                        questions={
                            "relevant_symbol": Choice(
                                instructions="Which of these code symbols is most relevant to completing the task?",
                                criteria=criteria,
                            )
                        },
                    )
                probabilities = response.answers["relevant_symbol"].probabilities
            except Exception:
                return []
            return [
                {**batch[int(idx)], "probability": prob}
                for idx, prob in probabilities.items()
            ]

        batch_results = await asyncio.gather(*(rank_batch(b) for b in batches))

    ranked = [item for batch in batch_results for item in batch]
    ranked.sort(key=lambda item: item["probability"], reverse=True)
    return ranked[:top_k]


LINE_CHUNK_SIZE = 20


def build_line_chunks(abs_path: str, start_line: int | None, end_line: int | None,
                       chunk_size: int = LINE_CHUNK_SIZE) -> list[dict]:
    with open(abs_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    total = len(lines)
    start = max(1, start_line or 1)
    end = min(total, end_line or total)

    chunks = []
    i = start
    while i <= end:
        j = min(i + chunk_size - 1, end)
        chunks.append({
            "start_line": i,
            "end_line": j,
            "snippet": "".join(lines[i - 1:j]),
        })
        i = j + 1
    return chunks


async def evaluate_lines_with_jev(task_description: str, chunks: list[dict], top_k: int = 10) -> list[dict]:
    if not chunks:
        return []

    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    batches = _chunk(chunks, CHOICE_BATCH_SIZE)

    async with AsyncTypeSafeClient() as client:

        async def rank_batch(batch: list[dict]) -> list[dict]:
            criteria = {
                str(idx): f"L{c['start_line']}-{c['end_line']}: {c['snippet'][:500]}"
                for idx, c in enumerate(batch)
            }
            try:
                async with sem:
                    response = await client.system_one(
                        state=f"【Task】\n{task_description}",
                        questions={
                            "relevant_lines": Choice(
                                instructions="Which of these code excerpts is most relevant to completing the task?",
                                criteria=criteria,
                            )
                        },
                    )
                probabilities = response.answers["relevant_lines"].probabilities
            except Exception:
                return []
            return [
                {**batch[int(idx)], "probability": prob}
                for idx, prob in probabilities.items()
            ]

        batch_results = await asyncio.gather(*(rank_batch(b) for b in batches))

    ranked = [item for batch in batch_results for item in batch]
    ranked.sort(key=lambda item: item["probability"], reverse=True)
    return ranked[:top_k]


def parse_diff_hunks(diff_text: str) -> list[dict]:
    # Splits a `git diff`-style unified diff into per-hunk chunks, each
    # tagged with its file (from the preceding "diff --git" line) and hunk
    # header (the "@@ ... @@" line). Hunks with no header (e.g. binary-file
    # notices) are dropped.
    hunks = []
    current_file = None
    current_header = None
    current_lines: list[str] = []

    def flush():
        if current_header is not None:
            hunks.append({
                "file": current_file or "?",
                "header": current_header,
                "content": "".join(current_lines),
            })

    for line in diff_text.splitlines(keepends=True):
        if line.startswith("diff --git "):
            flush()
            current_header = None
            current_lines = []
            parts = line.strip().split(" ")
            current_file = parts[-1][2:] if len(parts) >= 4 and parts[-1].startswith("b/") else line.strip()
        elif line.startswith("@@"):
            flush()
            current_header = line.strip()
            current_lines = []
        else:
            current_lines.append(line)
    flush()
    return hunks


async def evaluate_diff_hunks_with_jev(task_description: str, hunks: list[dict], top_k: int = 10) -> list[dict]:
    if not hunks:
        return []

    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    batches = _chunk(hunks, CHOICE_BATCH_SIZE)

    async with AsyncTypeSafeClient() as client:

        async def rank_batch(batch: list[dict]) -> list[dict]:
            criteria = {
                str(idx): f"{h['file']} {h['header']}\n{h['content'][:500]}"
                for idx, h in enumerate(batch)
            }
            try:
                async with sem:
                    response = await client.system_one(
                        state=f"【Task】\n{task_description}",
                        questions={
                            "relevant_hunk": Choice(
                                instructions=(
                                    "Which of these diff hunks is most relevant to (i.e. necessary for) "
                                    "completing the stated task? A hunk unrelated to the task is a likely "
                                    "out-of-scope change."
                                ),
                                criteria=criteria,
                            )
                        },
                    )
                probabilities = response.answers["relevant_hunk"].probabilities
            except Exception:
                return []
            return [
                {**batch[int(idx)], "probability": prob}
                for idx, prob in probabilities.items()
            ]

        batch_results = await asyncio.gather(*(rank_batch(b) for b in batches))

    ranked = [item for batch in batch_results for item in batch]
    # Ascending: least relevant to the task first -- these are the
    # out-of-scope-change candidates the verifier should look at.
    ranked.sort(key=lambda item: item["probability"])
    return ranked[:top_k] if top_k else ranked


def send_message(msg):
    real_stdout.write(json.dumps(msg) + "\n")
    real_stdout.flush()


# Use the current working directory provided by the agent as the repo root.
_REPO_ROOT = os.getcwd()
CALL_LOG_PATH = os.path.join(_REPO_ROOT, ".agents", "logs", "jev", "calls.jsonl")


def log_call(tool: str, task: str, scope: str, candidate_count: int, returned_count: int, returned: list) -> None:
    # Append-only usage log, independent of any session transcript.
    try:
        os.makedirs(os.path.dirname(CALL_LOG_PATH), exist_ok=True)
        record = {
            "timestamp": datetime.datetime.now().isoformat(timespec="seconds"),
            "tool": tool,
            "task": task,
            "scope": scope,
            "candidate_count": candidate_count,
            "returned_count": returned_count,
            "returned": returned,
        }
        with open(CALL_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:
        # Logging must never break the actual tool call.
        pass


def main():
    debug_log = open("C:/Users/reiwa/.gemini/config/mcp_scripts/mcp_debug.log", "a", encoding="utf-8")
    debug_log.write("Server started\n")
    debug_log.flush()
    while True:
        line = sys.stdin.readline()
        debug_log.write("Received: " + repr(line) + "\n")
        debug_log.flush()
        if not line:
            debug_log.write("EOF\n")
            debug_log.flush()
            break
        try:
            req = json.loads(line)
        except Exception as e:
            debug_log.write("JSON parse error: " + str(e) + "\n")
            debug_log.flush()
            continue

        method = req.get("method")

        if method == "initialize":
            send_message({
                "jsonrpc": "2.0",
                "id": req.get("id"),
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "jev-mcp-server", "version": "2.2.0"},
                },
            })
        elif method == "tools/list":
            send_message({
                "jsonrpc": "2.0",
                "id": req.get("id"),
                "result": {
                    "tools": [
                        {
                            "name": "search_relevant_files_jev",
                            "description": "Ranks candidate files under a directory against a task description using Jev's Choice primitive. Use this tool BEFORE viewing codebase files to efficiently triage the scope. Returns a JSON array of {file, probability}, sorted by probability descending.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "task": {"type": "string", "description": "The task description or query."},
                                    "dir": {"type": "string", "description": "Directory to scan (e.g. 'src/' or 'docs/features/'). Defaults to current directory."},
                                    "top_k": {"type": "integer", "description": "Max number of ranked files to return. Defaults to 20."},
                                },
                                "required": ["task"],
                            },
                        },
                        {
                            "name": "search_relevant_symbols_jev",
                            "description": "Ranks classes/functions/methods from docs/index/symbols.json against a task description using Jev's Choice primitive. Use this AFTER a plain Grep over symbols.json fails to find a match for a vague/abstract task -- it does semantic ranking, not substring matching. Returns a JSON array of {file, name, kind, start_line, end_line, docstring, probability}, sorted by probability descending.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "task": {"type": "string", "description": "The task description or query."},
                                    "files": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": "Optional: restrict ranking to symbols in these files (e.g. the output of search_relevant_files_jev). Omit to rank across all indexed files.",
                                    },
                                    "top_k": {"type": "integer", "description": "Max number of ranked symbols to return. Defaults to 15."},
                                },
                                "required": ["task"],
                            },
                        },
                        {
                            "name": "search_relevant_lines_jev",
                            "description": "Splits a single file (optionally a line range, e.g. a large symbol's start_line/end_line from search_relevant_symbols_jev) into fixed-size line windows and ranks them against a task description using Jev's Choice primitive. Use this when a symbol's own range is still too coarse to localize further (a long function) and you want to avoid reading the whole thing. Returns a JSON array of {file, start_line, end_line, snippet, probability}, sorted by probability descending.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "task": {"type": "string", "description": "The task description or query."},
                                    "file": {"type": "string", "description": "Path to the file to search within (repo-root-relative or absolute)."},
                                    "start_line": {"type": "integer", "description": "Optional: restrict to this start line. Defaults to the start of the file."},
                                    "end_line": {"type": "integer", "description": "Optional: restrict to this end line. Defaults to the end of the file."},
                                    "chunk_size": {"type": "integer", "description": "Lines per window. Defaults to 20."},
                                    "top_k": {"type": "integer", "description": "Max number of ranked windows to return. Defaults to 10."},
                                },
                                "required": ["task", "file"],
                            },
                        },
                        {
                            "name": "search_scope_violations_jev",
                            "description": "Splits a unified diff (e.g. the output of `git diff`) into per-hunk chunks and ranks them against a task description using Jev's Choice primitive, ascending by relevance. Use this as a first-pass screen for out-of-scope changes: hunks near the top of the result are least relevant to the stated task and are candidates to inspect manually -- this tool does not itself decide scope violations. Returns a JSON array of {file, header, content, probability}, sorted by probability ascending.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "task": {"type": "string", "description": "The approved task/requirements description to check the diff against."},
                                    "diff": {"type": "string", "description": "Unified diff text (e.g. the output of `git diff`)."},
                                    "top_k": {"type": "integer", "description": "Max number of low-relevance hunks to return. Defaults to 10."},
                                },
                                "required": ["task", "diff"],
                            },
                        },
                    ]
                },
            })
        elif method == "tools/call":
            tool_name = req.get("params", {}).get("name", "")
            args = req.get("params", {}).get("arguments", {})
            task = args.get("task", "")

            if tool_name == "search_relevant_symbols_jev":
                file_filter = args.get("files")
                top_k = args.get("top_k", 15)
                index = load_symbols_index(os.path.join(_REPO_ROOT, SYMBOLS_INDEX_PATH))
                candidates = flatten_symbols(index, file_filter)
                results = asyncio.run(evaluate_symbols_with_jev(task, candidates, top_k))
                log_call("search_relevant_symbols_jev", task, json.dumps(file_filter or "ALL"), len(candidates), len(results), results)
                results_text = json.dumps(results, ensure_ascii=False)
            elif tool_name == "search_relevant_lines_jev":
                file_arg = args.get("file", "")
                start_line = args.get("start_line")
                end_line = args.get("end_line")
                chunk_size = args.get("chunk_size", LINE_CHUNK_SIZE)
                top_k = args.get("top_k", 10)
                abs_path = file_arg if os.path.isabs(file_arg) else os.path.join(_REPO_ROOT, file_arg)
                rel_file = _normalize_rel_path(abs_path)
                chunks = build_line_chunks(abs_path, start_line, end_line, chunk_size) if os.path.isfile(abs_path) else []
                results = asyncio.run(evaluate_lines_with_jev(task, chunks, top_k))
                for r in results:
                    r["file"] = rel_file
                scope = f"{rel_file}:{start_line or 1}-{end_line or '$'}"
                log_call("search_relevant_lines_jev", task, scope, len(chunks), len(results), results)
                results_text = json.dumps(results, ensure_ascii=False)
            elif tool_name == "search_scope_violations_jev":
                diff_text = args.get("diff", "")
                top_k = args.get("top_k", 10)
                hunks = parse_diff_hunks(diff_text)
                results = asyncio.run(evaluate_diff_hunks_with_jev(task, hunks, top_k))
                log_call("search_scope_violations_jev", task, f"{len(hunks)} hunks", len(hunks), len(results), results)
                results_text = json.dumps(results, ensure_ascii=False)
            else:
                directory = args.get("dir", ".")
                top_k = args.get("top_k", 20)
                target_files = collect_target_files(directory)
                results = asyncio.run(evaluate_files_with_jev(task, target_files, top_k))
                log_call("search_relevant_files_jev", task, directory, len(target_files), len(results), results)
                results_text = json.dumps(results, ensure_ascii=False)

            send_message({
                "jsonrpc": "2.0",
                "id": req.get("id"),
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": results_text,
                        }
                    ]
                },
            })
        else:
            # Handle notifications like initialized
            pass


if __name__ == "__main__":
    main()
