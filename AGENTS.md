# ICO Generator — Agent Guide

## Commands

```bash
pip install -r requirements.txt   # dependencies: pywebview>=4.4, Pillow>=10.0.0
python main.py                    # run desktop app
python -m PyInstaller --clean icon_generator.spec   # build EXE
build.ps1                         # same as above (PowerShell wrapper)
```

No lint, typecheck, or test commands exist.

## Architecture

- **Entrypoint**: `main.py` launches a pywebview frameless window loading `web/index.html`
- **Frontend**: `web/` directory is canonical source. Root-level `index.html`, `app.js`, `style.css` are **stale duplicates** — edit `web/` files only
- **Dual-mode**: pywebview calls Python `Api` class methods (ICO generation via Pillow on backend). Standalone browser mode (without pywebview) uses client-side canvas+BMP for ICO generation
- **Specfile**: `icon_generator.spec` has extensive exclusions (PyQt, numpy, requests, tkinter, etc.) to minimize bundle size. Always use `--clean` when rebuilding
- **Python `generate_ico`**: resizes source images with `Image.Resampling.LANCZOS`, embeds BMP-format image data into ICO container via manual struct packing

## File Layout

```
main.py                 # Python backend + pywebview Api class
web/                    # frontend source (HTML/CSS/JS)
  index.html
  style.css
  app.js
icon_generator.spec     # PyInstaller config
build.ps1               # build script
requirements.txt        # pywebview, Pillow
```

## Conventions

- The `Api` class in `main.py` exposes JS-callable methods via `window.pywebview.api.*`
- Frontend detects pywebview by checking `window.pywebview && window.pywebview.api`
- All notifications are Chinese-localized
- Generated ICO use manual BMP format (not PIL's ICO save) for Windows compatibility