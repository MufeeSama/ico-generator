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
document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    await syncState();
    updateUI();
});

// 同步前后端状态
async function syncState() {
    if (window.pywebview) {
        try {
            const result = await window.pywebview.api.get_images();
            if (result.success) {
                uploadedImages = result.images;
                updateImagePreview();
            }
        } catch (error) {
            console.error('同步状态失败:', error);
        }
    }
}

// 绑定事件
function bindEvents() {
    // 添加图像按钮
    btnAddImage.addEventListener('click', async () => {
        if (window.pywebview) {
            const result = await window.pywebview.api.select_images();
            if (result.success) {
                addImagesToPreview(result.images);
            }
        } else {
            // 开发环境模拟
            showNotification('开发模式：请选择图片文件', 'info');
        }
    });

    // 添加目录按钮
    btnAddFolder.addEventListener('click', async () => {
        if (window.pywebview) {
            const result = await window.pywebview.api.select_folder();
            if (result.success) {
                addImagesToPreview(result.images);
            }
        } else {
            showNotification('开发模式：请选择文件夹', 'info');
        }
    });

    // 清除全部按钮
    btnClearAll.addEventListener('click', async () => {
        if (window.pywebview) {
            await window.pywebview.api.clear_images();
        }
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
imagePreviewList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-btn')) {
        const item = e.target.closest('.image-preview-item');
        const index = parseInt(item.dataset.index);
        
        if (!isNaN(index) && index >= 0 && index < uploadedImages.length) {
            if (window.pywebview) {
                await window.pywebview.api.remove_image(index);
            }
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
        sizes.push(cb.value);
    });

    // 添加自定义尺寸
    const custom = customSizes.value.trim();
    if (custom) {
        const customList = custom.split(',').map(s => s.trim()).filter(s => s && !isNaN(s));
        sizes.push(...customList);
    }

    return sizes;
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
        if (window.pywebview) {
            const result = await window.pywebview.api.generate_ico(sizes, colorMode.value);
            if (result.success) {
                generatedFiles = result.files;
                showResultModal(result.files);
                updateUI();
                showNotification('ICO 文件生成成功！', 'success');
            } else {
                showNotification(result.message, 'error');
            }
        } else {
            // 开发环境模拟
            setTimeout(() => {
                generatedFiles = uploadedImages.map((img, i) => ({
                    name: `icon${i + 1}.ico`,
                    path: `/tmp/icon${i + 1}.ico`,
                    sizes: sizes
                }));
                showResultModal(generatedFiles);
                updateUI();
                showNotification('ICO 文件生成成功！（模拟）', 'success');
            }, 1000);
        }
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
    if (window.pywebview) {
        const result = await window.pywebview.api.select_save_folder();
        if (result.success) {
            const saveResult = await window.pywebview.api.save_ico(result.path, generatedFiles);
            if (saveResult.success) {
                showNotification('ICO 文件已保存！', 'success');
                resultModal.classList.remove('show');
            } else {
                showNotification(saveResult.message, 'error');
            }
        }
    } else {
        showNotification('开发模式：文件保存模拟成功', 'success');
        resultModal.classList.remove('show');
    }
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
        if (window.pywebview) {
            // 先选择保存文件夹
            const folderResult = await window.pywebview.api.select_save_folder();
            if (folderResult.success) {
                const result = await window.pywebview.api.package_zip(generatedFiles, folderResult.path);
                if (result.success) {
                    showNotification('ZIP 打包成功！已保存到：' + result.path, 'success');
                } else {
                    showNotification(result.message, 'error');
                }
            }
        } else {
            showNotification('ZIP 打包成功！（模拟）', 'success');
        }
    } catch (error) {
        showNotification('打包失败：' + error.message, 'error');
    } finally {
        btnPackageZip.disabled = false;
        btnPackageZip.innerHTML = '<span class="icon">📦</span> 打包 ZIP';
    }
}

// 下载 ZIP（从结果对话框）
async function downloadZip() {
    if (generatedFiles.length === 0) {
        showNotification('没有可下载的文件', 'error');
        return;
    }

    try {
        if (window.pywebview) {
            const result = await window.pywebview.api.select_save_folder();
            if (result.success) {
                const zipResult = await window.pywebview.api.package_zip(generatedFiles, result.path);
                if (zipResult.success) {
                    showNotification('ZIP 文件已保存到：' + zipResult.path, 'success');
                    resultModal.classList.remove('show');
                } else {
                    showNotification(zipResult.message, 'error');
                }
            }
        } else {
            showNotification('开发模式：ZIP 下载模拟成功', 'success');
            resultModal.classList.remove('show');
        }
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
