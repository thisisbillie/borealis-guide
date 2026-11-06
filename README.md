# Borealis Guides

This is a design prototype, not an approved replacement for the current Borealis guides. The content pages are explicitly marked as editorial outlines. No existing guide text has been migrated.

## Preview locally

```sh
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m sphinx -W --keep-going -b html docs _build/html
python -m http.server 8000 --directory _build/html
```

Open http://localhost:8000.
