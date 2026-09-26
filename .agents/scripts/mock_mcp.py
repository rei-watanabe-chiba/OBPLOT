import sys
import json

def send_message(msg):
    sys.stdout.write(json.dumps(msg) + "\n")
    sys.stdout.flush()

def main():
    while True:
        line = sys.stdin.readline()
        if not line:
            break
        try:
            req = json.loads(line)
        except:
            continue
            
        if req.get("method") == "initialize":
            send_message({
                "jsonrpc": "2.0",
                "id": req.get("id"),
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "jev-mcp", "version": "1.0.0"}
                }
            })
        elif req.get("method") == "tools/list":
            send_message({
                "jsonrpc": "2.0",
                "id": req.get("id"),
                "result": {
                    "tools": [
                        {
                            "name": "search_relevant_files_jev",
                            "description": "Searches for relevant files based on a task description using the fast Jev API.",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "task": {"type": "string", "description": "The task description or query."},
                                    "dir": {"type": "string", "description": "Directory to scan (default: src/)"}
                                },
                                "required": ["task"]
                            }
                        }
                    ]
                }
            })
        elif req.get("method") == "tools/call":
            task = req.get("params", {}).get("arguments", {}).get("task", "")
            directory = req.get("params", {}).get("arguments", {}).get("dir", "src/")
            
            # Mock result for now
            result_files = ["src/Code.gs"]
            
            send_message({
                "jsonrpc": "2.0",
                "id": req.get("id"),
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result_files)
                        }
                    ]
                }
            })
        else:
            # Handle notifications like initialized
            pass

if __name__ == "__main__":
    main()
