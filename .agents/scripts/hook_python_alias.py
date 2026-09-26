import sys
import json
import re

def main():
    try:
        input_data = json.load(sys.stdin)
        tool_name = input_data.get("toolCall", {}).get("name")
        if tool_name == "run_command":
            cmd = input_data.get("toolCall", {}).get("args", {}).get("CommandLine", "")
            
            # Replace 'python ' with 'py ' if it's at the start or after a space/operator
            new_cmd = re.sub(r'(^|[\s&|;])python(\s+)', r'\1py\2', cmd)
            
            if new_cmd != cmd:
                print(json.dumps({
                    "decision": "allow",
                    "overwrite": {
                        "CommandLine": new_cmd
                    }
                }))
                return
        
        # Default allow
        print(json.dumps({"decision": "allow"}))
    except Exception as e:
        # Failsafe
        print(json.dumps({"decision": "allow"}))

if __name__ == "__main__":
    main()
