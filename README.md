# ICO 生成器

一个简单易用的 ICO 图标生成工具，支持多种预设尺寸和自定义尺寸，可批量生成 ICO 文件。

![ICO Generator](screenshot.png)

## 功能特性

- 🖼️ **批量处理** - 支持添加多张图片或整个目录
- 📁 **拖放上传** - 支持直接拖放图片到指定区域
- 📐 **多种尺寸** - 12 种预设尺寸（16×16 到 1024×1024）
- ✏️ **自定义尺寸** - 支持用逗号分隔输入自定义尺寸
- 🎨 **颜色模式** - 支持 RGB/Alpha (32位带透明) 和 RGB (24位无透明)
- 📦 **打包 ZIP** - 可将生成的 ICO 文件打包成 ZIP 压缩包
- 💻 **跨平台** - 基于 Python + pywebview，支持 Windows

## 技术栈

- **Python** - 后端逻辑 + ICO 生成
- **pywebview** - 桌面应用框架
- **PIL/Pillow** - 图像处理库
- **HTML/CSS/JS** - 前端界面

## 安装运行

### 方法一：直接运行源码

1. 克隆仓库
```bash
git clone https://github.com/yourusername/ico-generator.git
cd ico-generator
```

2. 安装依赖
```bash
pip install -r requirements.txt
```

3. 运行应用
```bash
python main.py
```

### 方法二：使用打包好的 EXE

直接下载 `ICO生成器.exe` 文件，双击运行即可。

> **注意**：Windows 10/11 系统需要安装 WebView2 运行时（大多数现代系统已预装）

## 使用说明

1. **添加图片**
   - 点击「添加图像」按钮选择图片文件
   - 或点击「添加目录」按钮批量导入整个文件夹
   - 或直接拖放图片到虚线框区域

2. **选择尺寸**
   - 勾选预设尺寸（可多选）
   - 或在自定义尺寸输入框中输入尺寸（用逗号分隔，如：48,96,192）

3. **选择颜色模式**
   - RGB/Alpha (32位，带透明)
   - RGB (24位，无透明)

4. **生成 ICO**
   - 点击「生成 ICO」按钮
   - 选择保存位置
   - 生成的 ICO 文件将包含所有选中的尺寸

5. **打包 ZIP**
   - 生成 ICO 后，点击「打包 ZIP」按钮
   - 选择保存位置
   - 所有 ICO 文件将被打包成一个 ZIP 文件

## 项目结构

```
ico-generator/
├── main.py                 # Python 主程序
├── requirements.txt        # Python 依赖
├── icon_generator.spec     # PyInstaller 配置文件
├── README.md              # 项目说明文档
├── web/                   # 前端文件
│   ├── index.html         # 主页面
│   ├── style.css          # 样式文件
│   └── app.js             # 前端逻辑
└── dist/                  # 打包输出目录
    └── ICO生成器.exe      # 可执行文件
```

## 打包成 EXE

如果你想自己打包成单文件 EXE：

```bash
# 安装 PyInstaller
pip install pyinstaller

# 打包
pyinstaller --clean icon_generator.spec
```

打包后的文件将位于 `dist/ICO生成器.exe`

## 系统要求

- **操作系统**：Windows 7/8/10/11
- **WebView2 运行时**：Windows 10/11 已预装，Windows 7/8 需要手动安装
- **Python**：3.8+（仅运行源码时需要）

## 许可证

MIT License

## 致谢

- [pywebview](https://github.com/r0x0r/pywebview) - 用于创建桌面应用
- [Pillow](https://python-pillow.org/) - 用于图像处理

## 更新日志

### v2.0
- ✨ 新增三种缩放模式（填充/适应/拉伸），对非正方形图片更友好
- 🌙 新增深色模式，支持一键切换，自动记住偏好
- 📊 生成 ICO 时显示进度条，大批次处理不再空白等待
- 🎯 界面优化：主题切换按钮移至标题栏

### v1.0.0
- 初始版本发布
- 支持批量生成 ICO 文件
- 支持多种预设尺寸
- 支持自定义尺寸
- 支持 ZIP 打包
