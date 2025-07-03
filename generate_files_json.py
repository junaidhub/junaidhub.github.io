import os
import json
from datetime import datetime

root_folder = 'data'
output = []

for folder in os.listdir(root_folder):
    folder_path = os.path.join(root_folder, folder)
    if os.path.isdir(folder_path):
        files = []
        for file in os.listdir(folder_path):
            file_path = os.path.join(folder_path, file)
            if os.path.isfile(file_path):
                ext = file.split('.')[-1].lower()
                updated = datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
                files.append({
                    "name": file,
                    "type": ext,
                    "url": f"{root_folder}/{folder}/{file}",
                    "updated": updated
                })
        output.append({
            "folder": folder,
            "files": sorted(files, key=lambda x: x['updated'], reverse=True)
        })

with open("files.json", "w") as f:
    json.dump(sorted(output, key=lambda x: x['folder']), f, indent=2)

print("✅ files.json generated.")
