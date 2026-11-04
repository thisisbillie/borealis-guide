# Borealis Guides

A simple Sphinx documentation starter with a persistent sidebar, built-in full-text search, breadcrumbs, mobile navigation, and editable Markdown pages. The teal, blue, purple, magenta, and navy theme follows the supplied colour reference.

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

## Edit the guide

Edit `docs/*.md`. Add new pages to a `toctree` in `docs/index.md`. Change colours and spacing in `docs/_static/borealis.css`. Site title, theme, and GitHub edit links live in `docs/conf.py`.

## GitHub Pages

The included workflow validates every push and pull request. To publish, select **Settings → Pages → Source → GitHub Actions**, then run the **Documentation** workflow on `main`. Deployment uses GitHub's `github-pages` environment. The site URL will be https://thisisbillie.github.io/borealis-guide/.

Review and replace the editorial outlines before using this as official documentation. No content or brand licence is implied by this starter.
