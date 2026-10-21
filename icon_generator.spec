# -*- mode: python ; coding: utf-8 -*-

import os
import sys

block_cipher = None

# 添加 web 目录作为数据文件
added_files = [
    ('web', 'web'),
]

# 平台专属隐藏导入
if sys.platform == 'win32':
    hiddenimports = [
        'webview',
        'PIL',
        'PIL.Image',
        'clr',
        'cffi',
        '_cffi_backend',
        'clr_loader',
        'clr_loader.ffi',
        'pythonnet',
        'pycparser',
        'pycparser.lextab',
        'pycparser.yacctab',
    ]
elif sys.platform == 'darwin':
    hiddenimports = [
        'webview',
        'PIL',
        'PIL.Image',
        'tkinter',
        'webview.platforms.cocoa',
        'objc',
        'Foundation',
        'AppKit',
        'WebKit',
        'CoreFoundation',
    ]
else:
    hiddenimports = [
        'webview',
        'PIL',
        'PIL.Image',
        'tkinter',
    ]

# 平台专属排除项
if sys.platform == 'win32':
    excludes = [
        'PyQt6',
        'PyQt6.QtCore',
        'PyQt6.QtGui',
        'PyQt6.QtWidgets',
        'PyQt6.QtNetwork',
        'PyQt6.QtOpenGL',
        'PyQt6.QtOpenGLWidgets',
        'PyQt6.QtWebChannel',
        'PyQt5',
        'PySide6',
        'PySide2',
        'numpy',
        'numpy.core',
        'cryptography',
        'charset_normalizer',
        'jinja2',
        'markupsafe',
        'unittest',
        'test',
        'pydoc',
        'pydoc_data',
        'tkinter',
        'Tkinter',
        'gtk',
        'gi',
        'wx',
        'wxPython',
        'curses',
        'setuptools',
        'pkg_resources',
        'wheel',
        'pip',
        'requests',
        'urllib3',
        'certifi',
        'idna',
    ]
else:
    excludes = [
        'numpy',
        'cryptography',
        'charset_normalizer',
        'jinja2',
        'markupsafe',
        'unittest',
        'test',
        'pydoc',
        'pydoc_data',
        'setuptools',
        'pkg_resources',
        'wheel',
        'pip',
        'requests',
        'urllib3',
        'certifi',
        'idna',
        'clr',
        'pythonnet',
        'clr_loader',
        'PyQt6',
        'PyQt5',
        'PySide6',
        'PySide2',
    ]

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=added_files,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

# 平台专属二进制过滤
if sys.platform == 'win32':
    binaries_to_exclude = [
        'Qt6',
        'Qt5',
        'numpy',
    ]
else:
    binaries_to_exclude = [
        'numpy',
    ]

a.binaries = [b for b in a.binaries if not any(excl in b[0] for excl in binaries_to_exclude)]

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe_name = 'ICO生成器'

# 检查是否有图标文件
icon_path = None
if os.path.exists('icon.ico') and sys.platform == 'win32':
    icon_path = 'icon.ico'
elif os.path.exists('icon.icns') and sys.platform == 'darwin':
    icon_path = 'icon.icns'

use_upx = sys.platform == 'win32'

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name=exe_name,
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=use_upx,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=icon_path,
)

# macOS: 单文件 EXE 已包含 binaries 与 datas，BUNDLE 仅需包裹 exe 避免重复打包
if sys.platform == 'darwin':
    app = BUNDLE(
        exe,
        name=exe_name + '.app',
        icon=icon_path,
        bundle_identifier='com.ico-generator.app',
        info_plist={
            'NSHighResolutionCapable': True,
            'CFBundleDisplayName': 'ICO 生成器',
            'CFBundleName': 'ICO生成器',
        },
    )
