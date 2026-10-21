# ICO 生成器 v2.0

一个简单易用的跨平台图标生成工具，支持 **ICO (Windows)** 与 **ICNS (macOS)** 双格式输出、多种预设尺寸与自定义尺寸、三种缩放模式以及批量生成与 ZIP 打包。

![ICO Generator](screenshot.png)

## 功能特性

- 🖼️ **批量处理** - 支持添加多张图片或导入整个文件夹，自动处理同名文件防覆盖
- 📁 **拖放上传** - 支持直接拖放图片到指定区域，桌面端与浏览器端双模兼容
- 📐 **多种尺寸** - 12 种预设尺寸（16×16 到 1024×1024），支持自定义尺寸（1~1024px）
- 🍎 **双格式输出** - 支持 Windows `.ico` 与 macOS `.icns` 格式，根据操作系统自动匹配默认格式
- 🎨 **颜色与缩放模式** - 支持 RGB/Alpha (32位带透明) 和 RGB (24位白底无透明)，提供填充、适应、拉伸三种缩放模式
- 📦 **打包 ZIP** - 支持一键将生成的图标打包为 UTF-8 兼容的 ZIP 压缩包
- 🌙 **深色模式** - 内置浅色/深色主题切换并自动记忆偏好

## 技术栈

- **Python** - 后端逻辑 + ICO/ICNS 二进制生成
- **pywebview** - 轻量级桌面应用容器
- **PIL/Pillow** - LANCZOS 高质量图像重采样与通道处理
- **HTML/CSS/JS** - 响应式前端界面（支持脱离后端直接在浏览器独立运行）

## 安装与运行

### 方法一：运行源码

1. 安装依赖
```bash
pip install -r requirements.txt
```

2. 启动桌面端应用
```bash
python main.py
```

3. 运行自动化测试
```bash
python -m unittest discover -s tests -v
```

### 方法二：打包可执行文件

```bash
pip install pyinstaller
python -m PyInstaller --clean icon_generator.spec
```

- Windows 打包产物位于 `dist/ICO生成器.exe`
- macOS 打包产物位于 `dist/ICO生成器.app`

## 项目结构

```
ico-generator/
├── main.py                 # Python 主程序与 pywebview API
├── requirements.txt        # Python 依赖
├── icon_generator.spec     # PyInstaller 打包配置
├── build.ps1               # PowerShell 打包脚本
├── README.md               # 项目说明文档
├── AGENTS.md               # 开发者与架构指南
├── web/                    # 前端源码目录
│   ├── index.html          # 主页面
│   ├── style.css           # 样式表
│   └── app.js              # 前端交互与浏览器端二进制构建逻辑
└── tests/                  # 自动化单元测试
    └── test_ico_generator.py
```

## 许可证
Apache License 2.0
