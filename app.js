// 全局状态
let uploadedImages = [];
let generatedFiles = [];

// DOM 元素
const dropZone = document.getElementById('dropZone');
const imagePreviewList = document.getElementById('imagePreviewList');
const imageCount = document.getElementById('imageCount');
const btnAddImage = document.getElementById('btnAddImage');
const btnAddFolder = document.getElementById('btnAddFolder');
const btnClearAll = document.getElementById('btnClearAll');
const btnSelectAll = document.getElementById('btnSelectAll');
const btnDeselectAll = document.getElementById('btnDeselectAll');
const btnGenerateIco = document.getElementById('btnGenerateIco');
const btnPackageZip = document.getElementById('btnPackageZip');
const btnAbout = document.getElementById('btnAbout');
const btnCloseAbout = document.getElementById('btnCloseAbout');
const btnCloseResult = document.getElementById('btnCloseResult');
const btnSaveIco = document.getElementById('btnSaveIco');
const btnDownloadZip = document.getElementById('btnDownloadZip');
const aboutModal = document.getElementById('aboutModal');
const resultModal = document.getElementById('resultModal');
const resultContent = document.getElementById('resultContent');
const customSizes = document.getElementById('customSizes');
const colorMode = document.getElementById('colorMode');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    updateUI();
});

// 绑定事件
function bindEvents() {
    // 添加图像按钮
    btnAddImage.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
            handleDroppedFiles(e.target.files);
        };
        input.click();
    });

    // 添加目录按钮
    btnAddFolder.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.directory = true;
        input.onchange = (e) => {
            handleDroppedFiles(e.target.files);
        };
        input.click();
    });

    // 清除全部按钮
    btnClearAll.addEventListener('click', () => {
        uploadedImages = [];
        updateImagePreview();
        updateUI();
    });

    // 拖放事件
    dropZone.addEventListener('click', () => btnAddImage.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleDroppedFiles(e.dataTransfer.files);
    });

    // 全选/取消全选
    btnSelectAll.addEventListener('click', () => {
        document.querySelectorAll('.size-checkbox input').forEach(cb => cb.checked = true);
    });
    btnDeselectAll.addEventListener('click', () => {
        document.querySelectorAll('.size-checkbox input').forEach(cb => cb.checked = false);
    });

    // 生成 ICO
    btnGenerateIco.addEventListener('click', generateIco);

    // 打包 ZIP
    btnPackageZip.addEventListener('click', packageZip);

    // 关于对话框
    btnAbout.addEventListener('click', () => aboutModal.classList.add('show'));
    btnCloseAbout.addEventListener('click', () => aboutModal.classList.remove('show'));

    // 结果对话框
    btnCloseResult.addEventListener('click', () => resultModal.classList.remove('show'));
    btnSaveIco.addEventListener('click', saveIcoFiles);
    btnDownloadZip.addEventListener('click', downloadZip);

    // 点击模态框外部关闭
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) aboutModal.classList.remove('show');
    });
    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) resultModal.classList.remove('show');
    });
}

// 添加图片到预览
function addImagesToPreview(images) {
    uploadedImages = uploadedImages.concat(images);
    updateImagePreview();
    updateUI();
}

// 更新图片预览
function updateImagePreview() {
    imagePreviewList.innerHTML = '';

    if (uploadedImages.length === 0) {
        dropZone.classList.remove('has-images');
        return;
    }

    dropZone.classList.add('has-images');

    uploadedImages.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.dataset.index = index;
        item.innerHTML = `
            <img src="${img.preview}" alt="${img.name}">
            <button class="remove-btn">&times;</button>
            <div class="file-name">${img.name}</div>
        `;
        imagePreviewList.appendChild(item);
    });
}

// 删除图片（使用事件委托）
imagePreviewList.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
        const item = e.target.closest('.image-preview-item');
        const index = parseInt(item.dataset.index);
        
        if (!isNaN(index) && index >= 0 && index < uploadedImages.length) {
            uploadedImages.splice(index, 1);
            updateImagePreview();
            updateUI();
        }
    }
});

// 更新 UI 状态
function updateUI() {
    imageCount.textContent = uploadedImages.length;
    btnGenerateIco.disabled = uploadedImages.length === 0;
    btnPackageZip.disabled = uploadedImages.length === 0 || generatedFiles.length === 0;
}

// 处理拖放的文件
function handleDroppedFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showNotification('没有找到有效的图片文件', 'warning');
        return;
    }
    
    let loadedCount = 0;
    const startId = uploadedImages.length;
    const images = new Array(imageFiles.length);
    
    imageFiles.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            images[idx] = {
                id: startId + idx,
                name: file.name,
                preview: e.target.result,
                path: file.name
            };
            loadedCount++;
            if (loadedCount === imageFiles.length) {
                addImagesToPreview(images.filter(Boolean));
            }
        };
        reader.onerror = () => {
            loadedCount++;
            if (loadedCount === imageFiles.length) {
                const validImages = images.filter(Boolean);
                if (validImages.length > 0) {
                    addImagesToPreview(validImages);
                }
            }
        };
        reader.readAsDataURL(file);
    });
}

// 获取选中的尺寸
function getSelectedSizes() {
    const sizes = [];
    document.querySelectorAll('.size-checkbox input:checked').forEach(cb => {
        sizes.push(parseInt(cb.value));
    });

    // 添加自定义尺寸
    const custom = customSizes.value.trim();
    if (custom) {
        const customList = custom.split(',').map(s => parseInt(s.trim())).filter(s => s && !isNaN(s));
        sizes.push(...customList);
    }

    return [...new Set(sizes)]; // 去重
}

// 将图片缩放到指定尺寸
function resizeImage(img, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 使用高质量缩放
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 绘制图片（保持比例，居中裁剪）
    const scale = Math.max(size / img.width, size / img.height);
    const x = (size - img.width * scale) / 2;
    const y = (size - img.height * scale) / 2;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    
    return canvas;
}

// 生成 ICO 文件（BMP 格式）
async function createIcoFile(images, sizes, colorModeValue) {
    const icoImages = [];
    
    for (const imgData of images) {
        const img = await loadImage(imgData.preview);
        const iconImages = [];
        
        for (const size of sizes) {
            const canvas = resizeImage(img, size);
            const bmpData = canvasToBmp(canvas, colorModeValue === 'rgba');
            iconImages.push({
                size: size,
                data: bmpData
            });
        }
        
        // 构建 ICO 文件
        const icoBuffer = buildIcoFile(iconImages);
        icoImages.push({
            name: imgData.name.replace(/\.[^/.]+$/, '') + '.ico',
            data: icoBuffer
        });
    }
    
    return icoImages;
}

// 加载图片
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Canvas 转 BMP
function canvasToBmp(canvas, hasAlpha) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const bitsPerPixel = hasAlpha ? 32 : 24;
    const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
    const imageSize = rowSize * height;
    const headerSize = 40;
    const fileSize = headerSize + imageSize;
    
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    
    // BMP 文件头
    let offset = 0;
    view.setUint32(offset, headerSize, true); offset += 4; // 头大小
    view.setInt32(offset, width, true); offset += 4;       // 宽度
    view.setInt32(offset, height * 2, true); offset += 4;  // 高度（双倍用于XOR和AND掩码）
    view.setUint16(offset, 1, true); offset += 2;          // 平面数
    view.setUint16(offset, bitsPerPixel, true); offset += 2; // 位深度
    view.setUint32(offset, hasAlpha ? 0 : 0, true); offset += 4; // 压缩
    view.setUint32(offset, imageSize, true); offset += 4;  // 图像大小
    view.setInt32(offset, 2835, true); offset += 4;        // X 分辨率
    view.setInt32(offset, 2835, true); offset += 4;        // Y 分辨率
    view.setUint32(offset, 0, true); offset += 4;          // 颜色数
    view.setUint32(offset, 0, true); offset += 4;          // 重要颜色
    
    // 像素数据（从下到上）
    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const b = data[i];
            const g = data[i + 1];
            const r = data[i + 2];
            const a = data[i + 3];
            
            view.setUint8(offset++, b);
            view.setUint8(offset++, g);
            view.setUint8(offset++, r);
            if (hasAlpha) {
                view.setUint8(offset++, a);
            }
        }
        // 行填充
        const padding = rowSize - (width * (bitsPerPixel / 8));
        for (let p = 0; p < padding; p++) {
            view.setUint8(offset++, 0);
        }
    }
    
    return new Uint8Array(buffer);
}

// 构建 ICO 文件
function buildIcoFile(iconImages) {
    const numImages = iconImages.length;
    const headerSize = 6 + numImages * 16;
    let dataOffset = headerSize;
    
    // 计算总大小
    let totalSize = headerSize;
    for (const img of iconImages) {
        totalSize += img.data.length;
    }
    
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    
    // ICO 文件头
    let offset = 0;
    view.setUint16(offset, 0, true); offset += 2;      // 保留
    view.setUint16(offset, 1, true); offset += 2;      // 类型 (1 = ICO)
    view.setUint16(offset, numImages, true); offset += 2; // 图像数量
    
    // 目录项
    for (const img of iconImages) {
        const size = img.size;
        view.setUint8(offset++, size > 255 ? 0 : size);  // 宽度
        view.setUint8(offset++, size > 255 ? 0 : size);  // 高度
        view.setUint8(offset++, 0);                      // 颜色数
        view.setUint8(offset++, 0);                      // 保留
        view.setUint16(offset, 1, true); offset += 2;    // 颜色平面
        view.setUint16(offset, 32, true); offset += 2;   // 位深度
        view.setUint32(offset, img.data.length, true); offset += 4; // 数据大小
        view.setUint32(offset, dataOffset, true); offset += 4; // 数据偏移
        dataOffset += img.data.length;
    }
    
    // 图像数据
    for (const img of iconImages) {
        for (let i = 0; i < img.data.length; i++) {
            view.setUint8(offset++, img.data[i]);
        }
    }
    
    return new Uint8Array(buffer);
}

// 生成 ICO
async function generateIco() {
    const sizes = getSelectedSizes();
    if (sizes.length === 0) {
        showNotification('请至少选择一个尺寸', 'error');
        return;
    }

    btnGenerateIco.disabled = true;
    btnGenerateIco.innerHTML = '<span class="icon">⏳</span> 生成中...';

    try {
        const icoFiles = await createIcoFile(uploadedImages, sizes, colorMode.value);
        
        generatedFiles = icoFiles.map((file, i) => ({
            name: file.name,
            data: file.data,
            sizes: sizes
        }));
        
        showResultModal(generatedFiles);
        updateUI();
        showNotification('ICO 文件生成成功！', 'success');
    } catch (error) {
        showNotification('生成失败：' + error.message, 'error');
    } finally {
        btnGenerateIco.disabled = false;
        btnGenerateIco.innerHTML = '<span class="icon">✨</span> 生成 ICO';
    }
}

// 显示结果对话框
function showResultModal(files) {
    resultContent.innerHTML = `
        <div class="result-file-list">
            ${files.map(f => `
                <div class="result-file-item">
                    <span class="result-file-icon">🎯</span>
                    <div class="result-file-info">
                        <div class="result-file-name">${f.name}</div>
                        <div class="result-file-sizes">尺寸: ${f.sizes.join(', ')}px</div>
                    </div>
                </div>
            `).join('')}
        </div>
        <p style="color: #666; font-size: 14px;">共生成 ${files.length} 个 ICO 文件</p>
    `;
    resultModal.classList.add('show');
}

// 保存 ICO 文件
async function saveIcoFiles() {
    for (const file of generatedFiles) {
        const blob = new Blob([file.data], { type: 'image/x-icon' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    showNotification('ICO 文件已下载！', 'success');
    resultModal.classList.remove('show');
}

// 打包 ZIP
async function packageZip() {
    if (generatedFiles.length === 0) {
        showNotification('请先生成 ICO 文件', 'error');
        return;
    }

    btnPackageZip.disabled = true;
    btnPackageZip.innerHTML = '<span class="icon">⏳</span> 打包中...';

    try {
        const zipBlob = await createZip(generatedFiles);
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'icons.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('ZIP 打包成功！', 'success');
    } catch (error) {
        showNotification('打包失败：' + error.message, 'error');
    } finally {
        btnPackageZip.disabled = false;
        btnPackageZip.innerHTML = '<span class="icon">📦</span> 打包 ZIP';
    }
}

// 创建 ZIP 文件（简化版）
async function createZip(files) {
    // 使用 JSZip 库或手动创建 ZIP
    // 这里我们使用一个简单的 ZIP 实现
    const zipParts = [];
    let centralDir = [];
    let offset = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const nameBytes = new TextEncoder().encode(file.name);
        const data = file.data;
        
        // 本地文件头
        const localHeader = new ArrayBuffer(30 + nameBytes.length);
        const lhView = new DataView(localHeader);
        let pos = 0;
        
        lhView.setUint32(pos, 0x04034b50, true); pos += 4;  // 签名
        lhView.setUint16(pos, 20, true); pos += 2;          // 版本
        lhView.setUint16(pos, 0, true); pos += 2;           // 标志
        lhView.setUint16(pos, 0, true); pos += 2;           // 压缩方法 (存储)
        lhView.setUint16(pos, 0, true); pos += 2;           // 时间
        lhView.setUint16(pos, 0, true); pos += 2;           // 日期
        lhView.setUint32(pos, crc32(data), true); pos += 4; // CRC32
        lhView.setUint32(pos, data.length, true); pos += 4; // 压缩大小
        lhView.setUint32(pos, data.length, true); pos += 4; // 未压缩大小
        lhView.setUint16(pos, nameBytes.length, true); pos += 2; // 名称长度
        lhView.setUint16(pos, 0, true); pos += 2;           // 额外字段长度
        
        // 写入文件名
        const lhBytes = new Uint8Array(localHeader);
        lhBytes.set(nameBytes, pos);
        
        zipParts.push(new Uint8Array(localHeader));
        zipParts.push(data);
        
        // 中央目录记录
        const cdHeader = new ArrayBuffer(46 + nameBytes.length);
        const cdView = new DataView(cdHeader);
        pos = 0;
        
        cdView.setUint32(pos, 0x02014b50, true); pos += 4;  // 签名
        cdView.setUint16(pos, 20, true); pos += 2;          // 创建版本
        cdView.setUint16(pos, 20, true); pos += 2;          // 需要版本
        cdView.setUint16(pos, 0, true); pos += 2;           // 标志
        cdView.setUint16(pos, 0, true); pos += 2;           // 压缩方法
        cdView.setUint16(pos, 0, true); pos += 2;           // 时间
        cdView.setUint16(pos, 0, true); pos += 2;           // 日期
        cdView.setUint32(pos, crc32(data), true); pos += 4; // CRC32
        cdView.setUint32(pos, data.length, true); pos += 4; // 压缩大小
        cdView.setUint32(pos, data.length, true); pos += 4; // 未压缩大小
        cdView.setUint16(pos, nameBytes.length, true); pos += 2; // 名称长度
        cdView.setUint16(pos, 0, true); pos += 2;           // 额外字段长度
        cdView.setUint16(pos, 0, true); pos += 2;           // 注释长度
        cdView.setUint16(pos, 0, true); pos += 2;           // 磁盘号
        cdView.setUint16(pos, 0, true); pos += 2;           // 内部属性
        cdView.setUint32(pos, 0, true); pos += 4;           // 外部属性
        cdView.setUint32(pos, offset, true); pos += 4;      // 本地头偏移
        
        const cdBytes = new Uint8Array(cdHeader);
        cdBytes.set(nameBytes, pos);
        
        centralDir.push(new Uint8Array(cdHeader));
        offset += localHeader.byteLength + data.length;
    }
    
    const centralDirOffset = offset;
    let centralDirSize = 0;
    
    for (const cd of centralDir) {
        centralDirSize += cd.length;
    }
    
    // 中央目录结束记录
    const eocd = new ArrayBuffer(22);
    const eocdView = new DataView(eocd);
    eocdView.setUint32(0, 0x06054b50, true);           // 签名
    eocdView.setUint16(4, 0, true);                    // 磁盘号
    eocdView.setUint16(6, 0, true);                    // 中央目录磁盘
    eocdView.setUint16(8, files.length, true);         // 磁盘上的记录数
    eocdView.setUint16(10, files.length, true);        // 总记录数
    eocdView.setUint32(12, centralDirSize, true);      // 中央目录大小
    eocdView.setUint32(16, centralDirOffset, true);    // 中央目录偏移
    eocdView.setUint16(20, 0, true);                   // 注释长度
    
    // 合并所有部分
    const totalSize = offset + centralDirSize + 22;
    const zipData = new Uint8Array(totalSize);
    let zipPos = 0;
    
    for (const part of zipParts) {
        zipData.set(part, zipPos);
        zipPos += part.length;
    }
    
    for (const cd of centralDir) {
        zipData.set(cd, zipPos);
        zipPos += cd.length;
    }
    
    zipData.set(new Uint8Array(eocd), zipPos);
    
    return new Blob([zipData], { type: 'application/zip' });
}

// 简单的 CRC32 实现
function crc32(data) {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 下载 ZIP（从结果对话框）
async function downloadZip() {
    if (generatedFiles.length === 0) {
        showNotification('没有可下载的文件', 'error');
        return;
    }

    try {
        const zipBlob = await createZip(generatedFiles);
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'icons.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('ZIP 文件已下载！', 'success');
        resultModal.classList.remove('show');
    } catch (error) {
        showNotification('下载失败：' + error.message, 'error');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    switch (type) {
        case 'success':
            notification.style.background = '#27ae60';
            break;
        case 'error':
            notification.style.background = '#e74c3c';
            break;
        case 'warning':
            notification.style.background = '#f39c12';
            break;
        default:
            notification.style.background = '#3498db';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
