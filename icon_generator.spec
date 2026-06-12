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
    # macOS: 使用 WebKit（系统自带），无需 pythonnet/clr
    # tkinter 用于 get_center_position() 获取屏幕尺寸（动态导入，需显式添加）
    # PyObjC 用于 Cocoa 集成（pywebview macOS 后端所需）
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
    # Linux 及其他
    hiddenimports = [
        'webview',
        'PIL',
        'PIL.Image',
        'tkinter',
    ]

# 平台专属排除项
if sys.platform == 'win32':
    excludes = [
        # 排除 PyQt - webview 可能自动检测并引入
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
        # 排除 numpy
        'numpy',
        'numpy.core',
        # 排除其他大型库
        'cryptography',
        'charset_normalizer',
        'jinja2',
        'markupsafe',
        # 排除测试和文档
        'unittest',
        'test',
        'pydoc',
        'pydoc_data',
        # 排除 tkinter
        'tkinter',
        'Tkinter',
        # 排除其他 GUI 框架
        'gtk',
        'gi',
        'wx',
        'wxPython',
        'curses',
        # 排除开发工具
        'setuptools',
        'pkg_resources',
        'wheel',
        'pip',
        # 排除网络库（除必要的）
        'requests',
        'urllib3',
        'certifi',
        'idna',
        # 注意：cffi 和 pycparser 不能排除，pythonnet 需要它们
    ]
else:
    # macOS/Linux: 无需排除 Windows 专属 GUI 框架
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
        # macOS 上避免误检测 Windows 库
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
    # macOS/Linux: 不存在 Qt6/Qt5 DLL，无需额外过滤
    binaries_to_exclude = [
        'numpy',
    ]

a.binaries = [b for b in a.binaries if not any(excl in b[0] for excl in binaries_to_exclude)]

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# macOS 打包为 .app 而非 .exe
exe_name = 'ICO生成器'
if sys.platform == 'darwin':
    # macOS 使用 BUNDLE() 包裹 EXE() 生成 .app 包
    pass

# 检查是否有图标文件
icon_path = None
if os.path.exists('icon.ico') and sys.platform == 'win32':
    icon_path = 'icon.ico'
elif os.path.exists('icon.icns') and sys.platform == 'darwin':
    icon_path = 'icon.icns'

# macOS 上 UPX 不可用，仅 Windows 启用
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

# macOS: 用 BUNDLE() 创建 .app 包结构
if sys.platform == 'darwin':
    app = BUNDLE(
        exe,
        a.binaries,
        a.datas,
        [],
        name=exe_name + '.app',
        icon=icon_path,
        bundle_identifier='com.ico-generator.app',
        info_plist={
            'NSHighResolutionCapable': True,
            'CFBundleDisplayName': 'ICO 生成器',
            'CFBundleName': 'ICO生成器',
        },
    )
