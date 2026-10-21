# ICO Generator — Agent Guide

## Commands

```bash
pip install -r requirements.txt                       # dependencies: pywebview>=4.4, Pillow>=10.0.0
python main.py                                        # run desktop app
python -m unittest discover -s tests                  # run automated unit tests
python -m PyInstaller --clean icon_generator.spec     # build EXE / macOS .app
./build.ps1                                           # PowerShell build wrapper (includes --clean)
```

## Architecture

- **Entrypoint**: `main.py` launches a `pywebview` frameless window loading `web/index.html`.
- **Frontend**: `web/` directory (`web/index.html`, `web/style.css`, `web/app.js`) is the single canonical source.
- **Dual-mode**:
  - **Desktop (`pywebview`)**: Uses Python `Api` class methods (`select_images`, `select_folder`, `add_base64_images`, `generate_ico`, `generate_icns`, `save_ico`, `package_zip`, `save_ico_from_base64`, `save_zip_from_base64`) backed by Pillow `Image.Resampling.LANCZOS`.
  - **Standalone Browser**: Automatically falls back to HTML5 `<input type="file">`, Canvas high-quality scaling, client-side ICO/ICNS binary builders, and `Blob` downloads.
- **Specfile**: `icon_generator.spec` excludes unused heavy packages (`PyQt`, `numpy`, `requests`, etc.) to minimize bundle size. Always pass `--clean` when rebuilding.
- **Binary Formats**:
  - **ICO**: Sizes `<= 256px` use BMP (DIB) format with BGRA/BGR XOR mask + 1-bit AND mask; sizes `> 256px` (`512, 768, 1024`) use embedded PNG streams per Windows Vista+ specification.
  - **ICNS**: Uses standard Apple OSType PNG chunks (`icp4`, `icp5`, `icp6`, `ic07`, `ic08`, `ic09`, `ic10`).

## File Layout

```
main.py                 # Python backend + pywebview Api class
web/                    # Frontend source (HTML/CSS/JS)
  index.html
  style.css
  app.js
tests/                  # Automated unit tests
  test_ico_generator.py
icon_generator.spec     # PyInstaller config
build.ps1               # PowerShell build script
requirements.txt        # pywebview, Pillow
```