import json
import os

def check_dupes(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Simple check for duplicate keys in same object
    # JSON.loads doesn't complain about dupes by default
    # but we can use object_pairs_hook
    def d_hook(pairs):
        d = {}
        for k, v in pairs:
            if k in d:
                print(f"Duplicate key found: {k} in {filepath}")
            d[k] = v
        return d

    json.loads(content, object_pairs_hook=d_hook)

base_path = "apps/app/src/assets/i18n/"
for f in os.listdir(base_path):
    if f.endswith(".json"):
        check_dupes(os.path.join(base_path, f))
