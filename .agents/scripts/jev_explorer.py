import os
import argparse
from typesafe_sdk import TypeSafeClient, Noul

def evaluate_files_with_jev(task_description: str, file_paths: list[str]) -> list[str]:
    # TypeSafeClient automatically reads the TYPESAFE_API_KEY environment variable.
    client = TypeSafeClient()
    relevant_files = []

    for path in file_paths:
        if not os.path.isfile(path):
            continue
            
        try:
            with open(path, 'r', encoding='utf-8') as f:
                # Read only the first 100 lines to save bandwidth and latency
                content = "".join(f.readlines()[:100])
            
            # Request relevance judgment from Jev API
            response = client.system_one(
                state=f"【Task】\n{task_description}\n\n【File Content (Snippet)】\n{content}",
                questions={
                    "is_relevant": Noul(
                        instructions="Is this file content relevant and necessary for completing or implementing the specified task?"
                    )
                }
            )
            
            # A threshold of 0.5 is used for the Boolean probability (Noul)
            is_relevant = response.answers["is_relevant"].noul > 0.5
            
            if is_relevant:
                relevant_files.append(path)
                
        except Exception as e:
            # Silently skip files that cannot be read (e.g., binary files)
            pass
            
    return relevant_files

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Jev Explorer: Token-efficient file relevance screener")
    parser.add_argument("--task", required=True, help="Current task description or search query")
    parser.add_argument("--files", nargs='*', help="List of specific file paths to evaluate")
    parser.add_argument("--dir", help="Directory to recursively scan for files to evaluate")
    args = parser.parse_args()

    target_files = []
    
    # Collect files from --files argument
    if args.files:
        target_files.extend(args.files)
        
    # Recursively collect files from --dir argument
    if args.dir and os.path.isdir(args.dir):
        for root, _, files in os.walk(args.dir):
            for file in files:
                # Basic filter to avoid heavy binary or irrelevant files
                if file.endswith(('.gs', '.html', '.js', '.md', '.json', '.txt', '.csv')):
                    target_files.append(os.path.join(root, file))
                    
    if not target_files:
        print("No valid files provided or found in the directory.")
        exit(1)

    results = evaluate_files_with_jev(args.task, target_files)
    
    # Output only the relevant file paths for the agent to parse
    for r in results:
        print(r)

