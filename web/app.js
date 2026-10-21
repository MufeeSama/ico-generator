// ICO Generator - JavaScript
// Dual-mode support: pywebview desktop backend + standalone browser fallback

const icons = {
    image: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    folder: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    trash: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    download: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    package: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>',
    sparkles: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    loader: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>',
    target: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    close: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

const ICNS_VALID_SIZES = [16, 32, 64, 128, 256, 512, 1024];
const MIN_ICON_SIZE = 1;
const MAX_ICON_SIZE = 1024;

// Precompute CRC32 lookup table once at module load
const CRC32_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    return table;
})();

// Global state
let uploadedImages = [];
let generatedFiles = [];
let currentTheme = localStorage.getItem('ico-generator-theme') || 'light';

// DOM elements
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
const outputFormat = document.getElementById('outputFormat');
const colorMode = document.getElementById('colorMode');
const resizeMode = document.getElementById('resizeMode');
const btnThemeToggle = document.getElementById('btnThemeToggle');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressPercent = document.getElementById('progressPercent');
const btnMinimize = document.getElementById('btnMinimize');
const btnClose = document.getElementById('btnClose');

function hasPywebviewApi() {
    return Boolean(window.pywebview && window.pywebview.api);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeStem(filename) {
    const base = String(filename || 'icon').replace(/\\/g, '/').split('/').pop();
    const withoutExt = base.replace(/\.[^/.]+$/, '');
    const cleaned = withoutExt.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
    return cleaned || 'icon';
}

function getUniqueFilename(stem, ext, usedNames) {
    const cleanStem = sanitizeStem(stem);
    const cleanExt = ext.startsWith('.') ? ext : `.${ext}`;
    let candidate = `${cleanStem}${cleanExt}`;
    let counter = 1;
    while (usedNames.has(candidate.toLowerCase())) {
        candidate = `${cleanStem}_${counter}${cleanExt}`;
        counter++;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(currentTheme);
    updateWindowControlsVisibility();
    autoDetectOs();
    bindEvents();
    syncSizeCheckboxesForFormat();
    updateUI();
});

// Listen for pywebview bridge ready event to prevent race condition
window.addEventListener('pywebviewready', () => {
    updateWindowControlsVisibility();
    autoDetectOs();
});

function updateWindowControlsVisibility() {
    const isDesktop = hasPywebviewApi();
    if (btnMinimize) {
        btnMinimize.style.display = isDesktop ? 'flex' : 'none';
    }
    if (btnClose) {
        btnClose.style.display = isDesktop ? 'flex' : 'none';
    }
}

// Auto-detect OS for default format
async function autoDetectOs() {
    if (hasPywebviewApi()) {
        try {
            const osType = await window.pywebview.api.get_os_type();
            if (osType === 'darwin') {
                outputFormat.value = 'icns';
                syncSizeCheckboxesForFormat();
                updateGenerateButtonText();
            }
            return;
        } catch (e) {
            // Fall through to browser detection
        }
    }
    if (navigator.platform && navigator.platform.toLowerCase().includes('mac')) {
        outputFormat.value = 'icns';
        syncSizeCheckboxesForFormat();
        updateGenerateButtonText();
    }
}

// Sync preset size checkboxes when switching between ICO and ICNS
function syncSizeCheckboxesForFormat() {
    const format = getSelectedFormat();
    document.querySelectorAll('.size-checkbox').forEach(label => {
        const input = label.querySelector('input[type="checkbox"]');
        if (!input) return;
        const sizeVal = parseInt(input.value, 10);
        if (format === 'icns' && !ICNS_VALID_SIZES.includes(sizeVal)) {
            input.disabled = true;
            label.classList.add('disabled');
            label.title = 'ICNS 格式不支持该尺寸';
        } else {
            input.disabled = false;
            label.classList.remove('disabled');
            label.removeAttribute('title');
        }
    });
}

// Bind events
function bindEvents() {
    if (btnMinimize) {
        btnMinimize.addEventListener('click', () => {
            if (hasPywebviewApi()) {
                window.pywebview.api.minimize_window();
            }
        });
    }
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            if (hasPywebviewApi()) {
                window.pywebview.api.close_window();
            }
        });
    }

    // Add image button (native dialog in pywebview, file input in browser)
    btnAddImage.addEventListener('click', async () => {
        if (hasPywebviewApi() && typeof window.pywebview.api.select_images === 'function') {
            try {
                const res = await window.pywebview.api.select_images();
                if (res && res.success && Array.isArray(res.images)) {
                    addImagesToPreview(res.images);
                }
                return;
            } catch (e) {
                // Fallback to browser file input
            }
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
            handleDroppedFiles(e.target.files);
        };
        input.click();
    });

    // Add folder button (native folder dialog in pywebview, webkitdirectory in browser)
    btnAddFolder.addEventListener('click', async () => {
        if (hasPywebviewApi() && typeof window.pywebview.api.select_folder === 'function') {
            try {
                const res = await window.pywebview.api.select_folder();
                if (res && res.success && Array.isArray(res.images)) {
                    if (res.images.length === 0) {
                        showNotification('所选目录中没有找到支持的图片文件', 'warning');
                    } else {
                        addImagesToPreview(res.images);
                    }
                }
                return;
            } catch (e) {
                // Fallback to browser folder input
            }
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.directory = true;
        input.onchange = (e) => {
            handleDroppedFiles(e.target.files);
        };
        input.click();
    });

    // Clear all button
    btnClearAll.addEventListener('click', async () => {
        uploadedImages = [];
        generatedFiles = [];
        if (hasPywebviewApi() && typeof window.pywebview.api.clear_images === 'function') {
            try {
                await window.pywebview.api.clear_images();
            } catch (e) {
                // Ignore
            }
        }
        updateImagePreview();
        updateUI();
    });

    // Drop zone events — ignore clicks originating from preview items or remove buttons
    dropZone.addEventListener('click', (e) => {
        if (e.target.closest('.image-preview-item') || e.target.closest('.remove-btn')) {
            return;
        }
        btnAddImage.click();
    });
    dropZone.addEventListener('keydown', (e) => {
        if (e.target === dropZone && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            btnAddImage.click();
        }
    });
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

    // Select all / deselect all (only toggle enabled checkboxes)
    btnSelectAll.addEventListener('click', () => {
        document.querySelectorAll('.size-checkbox input:not(:disabled)').forEach(cb => {
            cb.checked = true;
        });
    });
    btnDeselectAll.addEventListener('click', () => {
        document.querySelectorAll('.size-checkbox input:not(:disabled)').forEach(cb => {
            cb.checked = false;
        });
    });

    // Generate icon
    btnGenerateIco.addEventListener('click', generateIco);

    // Format change
    outputFormat.addEventListener('change', () => {
        syncSizeCheckboxesForFormat();
        updateGenerateButtonText();
    });

    // Theme toggle
    btnThemeToggle.addEventListener('click', toggleTheme);

    // Package ZIP
    btnPackageZip.addEventListener('click', packageZip);

    // About modal
    btnAbout.addEventListener('click', () => {
        aboutModal.classList.add('show');
        btnCloseAbout.focus();
    });
    btnCloseAbout.addEventListener('click', () => {
        aboutModal.classList.remove('show');
        btnAbout.focus();
    });

    // Result modal
    btnCloseResult.addEventListener('click', () => {
        resultModal.classList.remove('show');
        btnGenerateIco.focus();
    });
    btnSaveIco.addEventListener('click', saveIcoFiles);
    btnDownloadZip.addEventListener('click', downloadZip);

    // Click modal backdrop to close
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.classList.remove('show');
            btnAbout.focus();
        }
    });
    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) {
            resultModal.classList.remove('show');
            btnGenerateIco.focus();
        }
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (aboutModal.classList.contains('show')) {
                aboutModal.classList.remove('show');
                btnAbout.focus();
            }
            if (resultModal.classList.contains('show')) {
                resultModal.classList.remove('show');
                btnGenerateIco.focus();
            }
        }
    });
}

// Add images to preview
function addImagesToPreview(images) {
    uploadedImages = uploadedImages.concat(images);
    updateImagePreview();
    updateUI();
}

// Update image preview using safe DOM manipulation (prevents XSS)
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
        item.dataset.index = String(index);
        item.setAttribute('role', 'listitem');

        const imageEl = document.createElement('img');
        imageEl.src = img.preview;
        imageEl.alt = img.name;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-btn';
        removeBtn.setAttribute('aria-label', `移除图像 ${img.name}`);
        removeBtn.innerHTML = icons.close;

        const fileNameEl = document.createElement('div');
        fileNameEl.className = 'file-name';
        fileNameEl.textContent = img.name;
        fileNameEl.title = img.name;

        item.appendChild(imageEl);
        item.appendChild(removeBtn);
        item.appendChild(fileNameEl);
        imagePreviewList.appendChild(item);
    });
}

// Delete image (event delegation with stopPropagation)
imagePreviewList.addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('.remove-btn');
    if (removeBtn) {
        e.stopPropagation();
        const item = removeBtn.closest('.image-preview-item');
        const index = parseInt(item.dataset.index, 10);

        if (!isNaN(index) && index >= 0 && index < uploadedImages.length) {
            uploadedImages.splice(index, 1);
            if (hasPywebviewApi() && typeof window.pywebview.api.remove_image === 'function') {
                try {
                    await window.pywebview.api.remove_image(index);
                } catch (err) {
                    // Ignore
                }
            }
            updateImagePreview();
            updateUI();
        }
    }
});

// Update UI state
function updateUI() {
    imageCount.textContent = uploadedImages.length;
    btnGenerateIco.disabled = uploadedImages.length === 0;
    btnPackageZip.disabled = uploadedImages.length === 0 || generatedFiles.length === 0;
    updateGenerateButtonText();
}

// Update generate button text based on selected format
function updateGenerateButtonText() {
    const format = getSelectedFormat();
    btnGenerateIco.innerHTML = `<span class="btn-icon">${icons.sparkles}</span><span>生成 ${format === 'icns' ? 'ICNS' : 'ICO'}</span>`;
}

// Handle dropped or selected files
function handleDroppedFiles(files) {
    const validExtRegex = /\.(png|jpe?g|bmp|gif|webp|tiff?|ico)$/i;
    const imageFiles = Array.from(files || []).filter(
        f => (f.type && f.type.startsWith('image/')) || validExtRegex.test(f.name)
    );
    if (imageFiles.length === 0) {
        showNotification('没有找到有效的图片文件', 'warning');
        return;
    }

    let loadedCount = 0;
    const startId = uploadedImages.length;
    const images = new Array(imageFiles.length);

    const finalizeLoad = async () => {
        const validImages = images.filter(Boolean);
        if (validImages.length === 0) {
            showNotification('读取图片失败', 'error');
            return;
        }
        if (hasPywebviewApi() && typeof window.pywebview.api.add_base64_images === 'function') {
            try {
                const res = await window.pywebview.api.add_base64_images(validImages);
                if (res && res.success && Array.isArray(res.images) && res.images.length > 0) {
                    addImagesToPreview(res.images);
                    return;
                }
            } catch (err) {
                // Fallback to client-side preview objects
            }
        }
        addImagesToPreview(validImages);
    };

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
                finalizeLoad();
            }
        };
        reader.onerror = () => {
            loadedCount++;
            if (loadedCount === imageFiles.length) {
                finalizeLoad();
            }
        };
        reader.readAsDataURL(file);
    });
}

// Get selected sizes with range validation (1~1024px)
function getSelectedSizes(notifyInvalid = false) {
    const sizes = [];
    document.querySelectorAll('.size-checkbox input:checked:not(:disabled)').forEach(cb => {
        const val = parseInt(cb.value, 10);
        if (Number.isInteger(val) && val >= MIN_ICON_SIZE && val <= MAX_ICON_SIZE) {
            sizes.push(val);
        }
    });

    const custom = customSizes.value.trim();
    if (custom) {
        const tokens = custom.split(/[,，\s]+/).filter(Boolean);
        let hasInvalid = false;
        for (const token of tokens) {
            if (!/^\d+$/.test(token)) {
                hasInvalid = true;
                continue;
            }
            const val = parseInt(token, 10);
            if (val >= MIN_ICON_SIZE && val <= MAX_ICON_SIZE) {
                sizes.push(val);
            } else {
                hasInvalid = true;
            }
        }
        if (hasInvalid && notifyInvalid) {
            showNotification(`自定义尺寸仅支持 ${MIN_ICON_SIZE}~${MAX_ICON_SIZE} 之间的正整数，已忽略无效值`, 'warning');
        }
    }

    return [...new Set(sizes)].sort((a, b) => b - a);
}

// Resize image to specified size (with white background compositing in 24-bit RGB mode)
function resizeImage(img, size, mode, colorModeValue = 'rgba') {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // When 24-bit RGB (no transparency) is selected, fill white background first
    // so transparent pixels and "fit" mode padding become white instead of black
    if (colorModeValue === 'rgb') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
    }

    if (mode === 'stretch') {
        ctx.drawImage(img, 0, 0, size, size);
    } else if (mode === 'fit') {
        const scale = Math.min(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } else {
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    return canvas;
}

// Create ICO files (BMP for <=256px, PNG stream for >256px)
async function createIcoFile(images, sizes, colorModeValue, resizeModeValue, onProgress) {
    const icoImages = [];
    const usedNames = new Set();
    const hasAlpha = colorModeValue === 'rgba';
    const bpp = hasAlpha ? 32 : 24;

    for (let i = 0; i < images.length; i++) {
        const imgData = images[i];
        const img = await loadImage(imgData.preview);
        const iconImages = [];

        for (const size of sizes) {
            const canvas = resizeImage(img, size, resizeModeValue, colorModeValue);
            // Windows Vista+ ICO standard: sizes > 256px use PNG stream to avoid 4.3MB uncompressed BMP bloat
            const entryData = size > 256
                ? canvasToPngBuffer(canvas)
                : canvasToBmp(canvas, hasAlpha);
            iconImages.push({
                size: size,
                bpp: bpp,
                data: entryData
            });
        }

        const icoBuffer = buildIcoFile(iconImages);
        const uniqueName = getUniqueFilename(imgData.name, '.ico', usedNames);
        icoImages.push({
            name: uniqueName,
            data: icoBuffer,
            sizes: sizes
        });

        if (onProgress) {
            onProgress(i + 1, images.length);
            // Yield main thread so browser can repaint progress bar
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return icoImages;
}

// Load image
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('图片解码失败'));
        img.src = src;
    });
}

// Canvas to BMP (DIB)
function canvasToBmp(canvas, hasAlpha) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const bitsPerPixel = hasAlpha ? 32 : 24;
    const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4;
    const xorImageSize = rowSize * height;

    const andRowSize = Math.floor((width + 31) / 32) * 4;
    const andImageSize = andRowSize * height;

    const headerSize = 40;
    const totalImageSize = xorImageSize + andImageSize;
    const fileSize = headerSize + totalImageSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    let offset = 0;
    view.setUint32(offset, headerSize, true); offset += 4;
    view.setInt32(offset, width, true); offset += 4;
    view.setInt32(offset, height * 2, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, bitsPerPixel, true); offset += 2;
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, totalImageSize, true); offset += 4;
    view.setInt32(offset, 2835, true); offset += 4;
    view.setInt32(offset, 2835, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;

    // Pixel data (bottom to top)
    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            view.setUint8(offset++, data[i + 2]); // B
            view.setUint8(offset++, data[i + 1]); // G
            view.setUint8(offset++, data[i]);     // R
            if (hasAlpha) {
                view.setUint8(offset++, data[i + 3]); // A
            }
        }
        const padding = rowSize - (width * (bitsPerPixel / 8));
        for (let p = 0; p < padding; p++) {
            view.setUint8(offset++, 0);
        }
    }

    // Write AND mask (bottom to top)
    for (let y = height - 1; y >= 0; y--) {
        let bitBuffer = 0;
        let bitCount = 0;
        let bytesWritten = 0;

        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const a = data[i + 3];
            const bit = (hasAlpha && a < 128) ? 1 : 0;

            bitBuffer = (bitBuffer << 1) | bit;
            bitCount++;

            if (bitCount === 8) {
                view.setUint8(offset++, bitBuffer);
                bitBuffer = 0;
                bitCount = 0;
                bytesWritten++;
            }
        }

        if (bitCount > 0) {
            bitBuffer = bitBuffer << (8 - bitCount);
            view.setUint8(offset++, bitBuffer);
            bytesWritten++;
        }

        while (bytesWritten < andRowSize) {
            view.setUint8(offset++, 0);
            bytesWritten++;
        }
    }

    return new Uint8Array(buffer);
}

// Build ICO file with accurate bit depth per directory entry
function buildIcoFile(iconImages) {
    const numImages = iconImages.length;
    const headerSize = 6 + numImages * 16;
    let dataOffset = headerSize;

    let totalSize = headerSize;
    for (const img of iconImages) {
        totalSize += img.data.length;
    }

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    let offset = 0;
    view.setUint16(offset, 0, true); offset += 2;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numImages, true); offset += 2;

    for (const img of iconImages) {
        const size = img.size;
        const bpp = img.bpp || 32;
        view.setUint8(offset++, size >= 256 ? 0 : size); // Width (0 represents >=256)
        view.setUint8(offset++, size >= 256 ? 0 : size); // Height
        view.setUint8(offset++, 0);                      // Colors
        view.setUint8(offset++, 0);                      // Reserved
        view.setUint16(offset, 1, true); offset += 2;    // Color planes
        view.setUint16(offset, bpp, true); offset += 2;  // Accurate bit depth (24 or 32)
        view.setUint32(offset, img.data.length, true); offset += 4;
        view.setUint32(offset, dataOffset, true); offset += 4;
        dataOffset += img.data.length;
    }

    for (const img of iconImages) {
        new Uint8Array(buffer, offset).set(img.data);
        offset += img.data.length;
    }

    return new Uint8Array(buffer);
}

// ============================================
// ICNS Format Support (macOS)
// ============================================

function sizeToIcnsType(size) {
    const map = {
        16: 0x69637034,   // 'icp4'
        32: 0x69637035,   // 'icp5'
        64: 0x69637036,   // 'icp6'
        128: 0x69633037,  // 'ic07'
        256: 0x69633038,  // 'ic08'
        512: 0x69633039,  // 'ic09'
        1024: 0x69633130, // 'ic10'
    };
    return map[size] || null;
}

function canvasToPngBuffer(canvas) {
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function buildIcnsFile(iconImages) {
    let totalSize = 8;
    const entries = [];

    for (const img of iconImages) {
        const iconType = sizeToIcnsType(img.size);
        if (!iconType) continue;
        const entrySize = 8 + img.data.length;
        entries.push({ type: iconType, data: img.data, entrySize });
        totalSize += entrySize;
    }

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint32(offset, 0x69636E73, false); // 'icns'
    offset += 4;
    view.setUint32(offset, totalSize, false);
    offset += 4;

    for (const entry of entries) {
        view.setUint32(offset, entry.type, false);
        offset += 4;
        view.setUint32(offset, entry.entrySize, false);
        offset += 4;
        new Uint8Array(buffer, offset).set(entry.data);
        offset += entry.data.length;
    }

    return new Uint8Array(buffer);
}

async function createIcnsFile(images, sizes, colorModeValue, resizeModeValue, onProgress) {
    const icnsImages = [];
    const validSizes = sizes.filter(s => ICNS_VALID_SIZES.includes(s));
    if (validSizes.length === 0) {
        throw new Error('ICNS 格式仅支持 16, 32, 64, 128, 256, 512, 1024 尺寸');
    }

    const usedNames = new Set();

    for (let i = 0; i < images.length; i++) {
        const imgData = images[i];
        const img = await loadImage(imgData.preview);
        const pngBuffers = [];

        for (const size of validSizes) {
            // resizeImage already composites onto white background when colorModeValue === 'rgb'
            const canvas = resizeImage(img, size, resizeModeValue, colorModeValue);
            const pngData = canvasToPngBuffer(canvas);
            pngBuffers.push({ size: size, data: pngData });
        }

        const icnsBuffer = buildIcnsFile(pngBuffers);
        const uniqueName = getUniqueFilename(imgData.name, '.icns', usedNames);
        icnsImages.push({
            name: uniqueName,
            data: icnsBuffer,
            sizes: validSizes
        });

        if (onProgress) {
            onProgress(i + 1, images.length);
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return icnsImages;
}

// ============================================
// Generate Icons (ICO or ICNS)
// ============================================

function getSelectedFormat() {
    return document.getElementById('outputFormat')?.value || 'ico';
}

function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function generateIco() {
    const sizes = getSelectedSizes(true);
    if (sizes.length === 0) {
        showNotification('请至少选择一个有效尺寸', 'error');
        return;
    }

    const format = getSelectedFormat();
    const formatLabel = format === 'icns' ? 'ICNS' : 'ICO';

    if (format === 'icns') {
        const validIcnsSizes = sizes.filter(s => ICNS_VALID_SIZES.includes(s));
        if (validIcnsSizes.length === 0) {
            showNotification('ICNS 格式仅支持 16, 32, 64, 128, 256, 512, 1024 尺寸', 'error');
            return;
        }
    }

    btnGenerateIco.disabled = true;
    btnGenerateIco.innerHTML = `<span class="btn-icon">${icons.loader}</span><span>生成中...</span>`;

    showProgress(true, 0, '正在准备处理...');

    try {
        let iconFiles = null;

        // Try Python backend (Pillow LANCZOS) first when running inside pywebview
        if (hasPywebviewApi()) {
            const apiMethod = format === 'icns'
                ? window.pywebview.api.generate_icns
                : window.pywebview.api.generate_ico;
            if (typeof apiMethod === 'function') {
                const res = await apiMethod(sizes, colorMode.value, resizeMode.value);
                if (res && res.success && Array.isArray(res.files) && res.files.length > 0) {
                    iconFiles = res.files.map(f => ({
                        name: f.name,
                        path: f.path,
                        sizes: f.sizes || sizes,
                        data: f.base64 ? base64ToUint8Array(f.base64) : null
                    }));
                    showProgress(true, 100, `已完成 ${iconFiles.length}/${iconFiles.length} 张图片`);
                }
            }
        }

        // Fallback to client-side Canvas generation
        if (!iconFiles) {
            if (format === 'icns') {
                iconFiles = await createIcnsFile(
                    uploadedImages,
                    sizes,
                    colorMode.value,
                    resizeMode.value,
                    (current, total) => {
                        const pct = Math.round((current / total) * 100);
                        showProgress(true, pct, `正在处理 ${current}/${total} 张图片`);
                    }
                );
            } else {
                iconFiles = await createIcoFile(
                    uploadedImages,
                    sizes,
                    colorMode.value,
                    resizeMode.value,
                    (current, total) => {
                        const pct = Math.round((current / total) * 100);
                        showProgress(true, pct, `正在处理 ${current}/${total} 张图片`);
                    }
                );
            }
        }

        generatedFiles = iconFiles.map(file => ({
            name: file.name,
            path: file.path || null,
            data: file.data,
            sizes: file.sizes || sizes,
            format: format
        }));

        showProgress(false);
        showResultModal(generatedFiles);
        updateUI();
        showNotification(`${formatLabel} 文件生成成功`, 'success');
    } catch (error) {
        showProgress(false);
        showNotification('生成失败：' + error.message, 'error');
    } finally {
        btnGenerateIco.disabled = uploadedImages.length === 0;
        updateGenerateButtonText();
    }
}

// Show result modal with HTML-escaped filenames
function showResultModal(files) {
    const formatLabel = files[0]?.format === 'icns' ? 'ICNS' : 'ICO';
    resultContent.innerHTML = `
        <div class="result-file-list" role="list" aria-label="生成的文件列表">
            ${files.map(f => `
                <div class="result-file-item" role="listitem">
                    <span class="result-file-icon">${icons.target}</span>
                    <div class="result-file-info">
                        <div class="result-file-name">${escapeHtml(f.name)}</div>
                        <div class="result-file-sizes">尺寸: ${escapeHtml((f.sizes || []).join(', '))}px</div>
                    </div>
                </div>
            `).join('')}
        </div>
        <p style="color: var(--color-text-secondary); font-size: var(--font-size-base);">共生成 ${files.length} 个 ${formatLabel} 文件</p>
    `;
    resultModal.classList.add('show');
    btnSaveIco.focus();
}

// Save ICO/ICNS files
async function saveIcoFiles() {
    if (generatedFiles.length === 0) {
        showNotification('没有可保存的文件', 'error');
        return;
    }

    const formatLabel = generatedFiles[0]?.format === 'icns' ? 'ICNS' : 'ICO';

    if (hasPywebviewApi()) {
        try {
            // Prefer direct file copy if backend generated the files in temp_dir
            if (generatedFiles.every(f => f.path) && typeof window.pywebview.api.select_save_folder === 'function') {
                const folderRes = await window.pywebview.api.select_save_folder();
                if (!folderRes || !folderRes.success) {
                    if (folderRes?.message && folderRes.message !== '未选择文件夹') {
                        showNotification(folderRes.message, 'warning');
                    }
                    return;
                }
                const saveRes = await window.pywebview.api.save_ico(folderRes.path, generatedFiles);
                if (saveRes && saveRes.success) {
                    showNotification(`${formatLabel} 文件已保存`, 'success');
                    resultModal.classList.remove('show');
                } else {
                    showNotification(saveRes?.message || '保存失败', 'error');
                }
                return;
            }

            // Otherwise save from base64
            const filesForSave = generatedFiles.map(f => ({
                name: f.name,
                base64: arrayBufferToBase64(f.data)
            }));

            const result = await window.pywebview.api.save_ico_from_base64(filesForSave);
            if (result && result.success) {
                showNotification(`${formatLabel} 文件已保存`, 'success');
                resultModal.classList.remove('show');
            } else if (result?.message !== '未选择保存位置') {
                showNotification(result?.message || '保存失败', 'error');
            }
        } catch (error) {
            showNotification('保存失败：' + error.message, 'error');
        }
    } else {
        const mimeType = generatedFiles[0]?.format === 'icns' ? 'image/x-icns' : 'image/x-icon';
        for (const file of generatedFiles) {
            const blob = new Blob([file.data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        showNotification(`${formatLabel} 文件已下载`, 'success');
        resultModal.classList.remove('show');
    }
}

// Chunked ArrayBuffer/Uint8Array to base64
function arrayBufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const chunkSize = 8192;
    const chunks = [];
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize)));
    }
    return btoa(chunks.join(''));
}

// Shared helper to save/download ZIP across pywebview desktop and browser modes
async function saveOrDownloadZip(closeModalOnSuccess = false) {
    if (generatedFiles.length === 0) {
        showNotification('请先生成图标文件', 'error');
        return;
    }

    if (hasPywebviewApi()) {
        // If backend generated files exist, use backend package_zip with folder dialog
        if (generatedFiles.every(f => f.path) && typeof window.pywebview.api.select_save_folder === 'function') {
            const folderRes = await window.pywebview.api.select_save_folder();
            if (!folderRes || !folderRes.success) {
                return;
            }
            const zipRes = await window.pywebview.api.package_zip(generatedFiles, folderRes.path);
            if (zipRes && zipRes.success) {
                showNotification('ZIP 打包并保存成功', 'success');
                if (closeModalOnSuccess) {
                    resultModal.classList.remove('show');
                }
            } else {
                showNotification(zipRes?.message || '打包失败', 'error');
            }
            return;
        }

        // Otherwise build ZIP in frontend and save via backend save_zip_from_base64 dialog
        if (typeof window.pywebview.api.save_zip_from_base64 === 'function') {
            const zipBytes = await createZipBytes(generatedFiles);
            const b64Zip = arrayBufferToBase64(zipBytes);
            const saveRes = await window.pywebview.api.save_zip_from_base64(b64Zip, 'icons.zip');
            if (saveRes && saveRes.success) {
                showNotification('ZIP 文件已保存', 'success');
                if (closeModalOnSuccess) {
                    resultModal.classList.remove('show');
                }
            } else if (saveRes?.message && saveRes.message !== '未选择保存位置') {
                showNotification(saveRes.message, 'error');
            }
            return;
        }
    }

    // Browser download mode
    const zipBlob = await createZip(generatedFiles);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'icons.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('ZIP 文件已下载', 'success');
    if (closeModalOnSuccess) {
        resultModal.classList.remove('show');
    }
}

// Package ZIP button handler
async function packageZip() {
    if (generatedFiles.length === 0) {
        showNotification('请先生成图标文件', 'error');
        return;
    }

    btnPackageZip.disabled = true;
    btnPackageZip.innerHTML = `<span class="btn-icon">${icons.loader}</span><span>打包中...</span>`;

    try {
        await saveOrDownloadZip(false);
    } catch (error) {
        showNotification('打包失败：' + error.message, 'error');
    } finally {
        btnPackageZip.disabled = uploadedImages.length === 0 || generatedFiles.length === 0;
        btnPackageZip.innerHTML = `<span class="btn-icon">${icons.package}</span><span>打包 ZIP</span>`;
    }
}

// Download ZIP from result modal
async function downloadZip() {
    if (generatedFiles.length === 0) {
        showNotification('没有可下载的文件', 'error');
        return;
    }
    try {
        await saveOrDownloadZip(true);
    } catch (error) {
        showNotification('下载失败：' + error.message, 'error');
    }
}

// Convert JS Date to MS-DOS Date and Time for ZIP headers
function getDosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = Math.floor(date.getSeconds() / 2);

    const dosTime = ((hours & 0x1F) << 11) | ((minutes & 0x3F) << 5) | (seconds & 0x1F);
    const dosDate = (((year - 1980) & 0x7F) << 9) | ((month & 0x0F) << 5) | (day & 0x1F);
    return { dosTime, dosDate };
}

// Create ZIP raw Uint8Array (with UTF-8 Bit 11 flag and filename deduplication)
async function createZipBytes(files) {
    const zipParts = [];
    const centralDir = [];
    const usedNames = new Set();
    let offset = 0;
    const { dosTime, dosDate } = getDosDateTime();
    const UTF8_FLAG = 0x0800; // Bit 11: filename and comment are UTF-8 encoded

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extMatch = String(file.name).match(/(\.[^/.]+)$/);
        const ext = extMatch ? extMatch[1] : '.ico';
        const uniqueName = getUniqueFilename(file.name, ext, usedNames);
        const nameBytes = new TextEncoder().encode(uniqueName);
        const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
        const fileCrc = crc32(data);

        // Local file header
        const localHeader = new ArrayBuffer(30 + nameBytes.length);
        const lhView = new DataView(localHeader);
        let pos = 0;

        lhView.setUint32(pos, 0x04034b50, true); pos += 4;  // Signature
        lhView.setUint16(pos, 20, true); pos += 2;          // Version needed
        lhView.setUint16(pos, UTF8_FLAG, true); pos += 2;   // Flags (Bit 11 = UTF-8)
        lhView.setUint16(pos, 0, true); pos += 2;           // Compression method (store)
        lhView.setUint16(pos, dosTime, true); pos += 2;     // Modification time
        lhView.setUint16(pos, dosDate, true); pos += 2;     // Modification date
        lhView.setUint32(pos, fileCrc, true); pos += 4;     // CRC32
        lhView.setUint32(pos, data.length, true); pos += 4; // Compressed size
        lhView.setUint32(pos, data.length, true); pos += 4; // Uncompressed size
        lhView.setUint16(pos, nameBytes.length, true); pos += 2; // Name length
        lhView.setUint16(pos, 0, true); pos += 2;           // Extra field length

        const lhBytes = new Uint8Array(localHeader);
        lhBytes.set(nameBytes, pos);

        zipParts.push(lhBytes);
        zipParts.push(data);

        // Central directory record
        const cdHeader = new ArrayBuffer(46 + nameBytes.length);
        const cdView = new DataView(cdHeader);
        pos = 0;

        cdView.setUint32(pos, 0x02014b50, true); pos += 4;  // Signature
        cdView.setUint16(pos, 20, true); pos += 2;          // Version made by
        cdView.setUint16(pos, 20, true); pos += 2;          // Version needed
        cdView.setUint16(pos, UTF8_FLAG, true); pos += 2;   // Flags (Bit 11 = UTF-8)
        cdView.setUint16(pos, 0, true); pos += 2;           // Compression method
        cdView.setUint16(pos, dosTime, true); pos += 2;     // Time
        cdView.setUint16(pos, dosDate, true); pos += 2;     // Date
        cdView.setUint32(pos, fileCrc, true); pos += 4;     // CRC32
        cdView.setUint32(pos, data.length, true); pos += 4; // Compressed size
        cdView.setUint32(pos, data.length, true); pos += 4; // Uncompressed size
        cdView.setUint16(pos, nameBytes.length, true); pos += 2; // Name length
        cdView.setUint16(pos, 0, true); pos += 2;           // Extra field length
        cdView.setUint16(pos, 0, true); pos += 2;           // Comment length
        cdView.setUint16(pos, 0, true); pos += 2;           // Disk number
        cdView.setUint16(pos, 0, true); pos += 2;           // Internal attributes
        cdView.setUint32(pos, 0, true); pos += 4;           // External attributes
        cdView.setUint32(pos, offset, true); pos += 4;      // Local header offset

        const cdBytes = new Uint8Array(cdHeader);
        cdBytes.set(nameBytes, pos);

        centralDir.push(cdBytes);
        offset += localHeader.byteLength + data.length;
    }

    const centralDirOffset = offset;
    let centralDirSize = 0;
    for (const cd of centralDir) {
        centralDirSize += cd.length;
    }

    const eocd = new ArrayBuffer(22);
    const eocdView = new DataView(eocd);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, files.length, true);
    eocdView.setUint16(10, files.length, true);
    eocdView.setUint32(12, centralDirSize, true);
    eocdView.setUint32(16, centralDirOffset, true);
    eocdView.setUint16(20, 0, true);

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

    return zipData;
}

async function createZip(files) {
    const zipData = await createZipBytes(files);
    return new Blob([zipData], { type: 'application/zip' });
}

// Fast CRC32 using precomputed table
function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = CRC32_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ============================================
// Theme Toggle (Dark Mode)
// ============================================

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    localStorage.setItem('ico-generator-theme', currentTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

// ============================================
// Progress Bar & Notifications
// ============================================

function showProgress(active, percent, text) {
    if (active) {
        progressContainer.classList.add('active');
        progressFill.style.width = percent + '%';
        progressPercent.textContent = percent + '%';
        if (text) {
            progressText.textContent = text;
        }
        progressContainer.setAttribute('aria-valuenow', percent);
    } else {
        progressContainer.classList.remove('active');
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        progressText.textContent = '准备中...';
        progressContainer.setAttribute('aria-valuenow', 0);
    }
}

function getNotificationContainer() {
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    return container;
}

function showNotification(message, type = 'info') {
    const container = getNotificationContainer();
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');
    notification.textContent = message;
    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}