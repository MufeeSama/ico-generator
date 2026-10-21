import atexit
import base64
from io import BytesIO
import os
import platform
import re
import shutil
import struct
import sys
import tempfile
import traceback
import zipfile
from PIL import Image

try:
    import webview
except ImportError:
    webview = None


VALID_IMAGE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.tiff', '.ico')
ICNS_SUPPORTED_SIZES = (16, 32, 64, 128, 256, 512, 1024)
MIN_ICON_SIZE = 1
MAX_ICON_SIZE = 1024


class Api:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix='ico_gen_')
        self.upload_dir = os.path.join(self.temp_dir, 'uploads')
        os.makedirs(self.upload_dir, exist_ok=True)
        self.uploaded_images = []
        self._window = None  # 私有属性，避免 pywebview 序列化窗口对象导致 COM 错误
        atexit.register(self._cleanup_on_exit)

    def set_window(self, window):
        """设置窗口引用"""
        self._window = window

    def _get_active_window(self):
        """安全获取当前活动窗口"""
        if self._window is not None:
            return self._window
        if webview is not None and getattr(webview, 'windows', None):
            return webview.windows[0]
        return None

    def minimize_window(self):
        """最小化窗口"""
        win = self._get_active_window()
        if win:
            win.minimize()
            return {'success': True}
        return {'success': False, 'message': '窗口未初始化'}

    def close_window(self):
        """关闭窗口"""
        win = self._get_active_window()
        if win:
            win.destroy()
            return {'success': True}
        return {'success': False, 'message': '窗口未初始化'}

    def _cleanup_on_exit(self):
        """程序退出时自动清理临时文件"""
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir, ignore_errors=True)
        except Exception:
            pass

    @staticmethod
    def _sanitize_filename(name, default_name='icon.ico'):
        """净化文件名，防止路径遍历攻击与非法字符"""
        if not name or not isinstance(name, str):
            return default_name
        # 统一分隔符并提取基名
        normalized = name.replace('\\', '/').split('/')[-1]
        # 过滤控制字符与 Windows/Unix 非法文件名字符
        cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', normalized).strip(' .')
        if not cleaned or cleaned in ('.', '..'):
            return default_name
        return cleaned

    @staticmethod
    def _get_unique_filename(stem, ext, used_names):
        """生成不重复的文件名，防止同名图片互相覆盖"""
        safe_stem = Api._sanitize_filename(stem, default_name='icon')
        if not ext.startswith('.'):
            ext = '.' + ext
        candidate = f'{safe_stem}{ext}'
        counter = 1
        while candidate.lower() in used_names:
            candidate = f'{safe_stem}_{counter}{ext}'
            counter += 1
        used_names.add(candidate.lower())
        return candidate

    @staticmethod
    def _safe_join(base_dir, filename):
        """安全拼接路径并校验目标路径位于基准目录内"""
        safe_name = Api._sanitize_filename(filename)
        base_abs = os.path.abspath(base_dir)
        target_abs = os.path.abspath(os.path.join(base_abs, safe_name))
        if os.path.commonpath([base_abs, target_abs]) != base_abs:
            raise ValueError(f'非法文件路径: {filename}')
        return target_abs

    @staticmethod
    def _parse_sizes(sizes, valid_set=None):
        """解析并校验尺寸列表（限制在 1~1024 之间并去重排序）"""
        parsed = []
        for s in sizes or []:
            try:
                val = int(s)
            except (ValueError, TypeError):
                continue
            if MIN_ICON_SIZE <= val <= MAX_ICON_SIZE:
                if valid_set is None or val in valid_set:
                    parsed.append(val)
        return sorted(set(parsed), reverse=True)

    def select_images(self):
        """打开文件对话框选择图片"""
        win = self._get_active_window()
        if not win:
            return {'success': False, 'message': '窗口未初始化'}
        result = win.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=True,
            file_types=('Image Files (*.png;*.jpg;*.jpeg;*.bmp;*.gif;*.webp;*.tiff;*.ico)',)
        )
        if result:
            images = []
            for path in result:
                img_info = self._process_image(path, len(self.uploaded_images) + len(images))
                if img_info:
                    images.append(img_info)
            self.uploaded_images.extend(images)
            return {'success': True, 'images': images, 'total': len(self.uploaded_images)}
        return {'success': False, 'message': '未选择文件'}

    def select_folder(self):
        """打开文件夹对话框选择目录"""
        win = self._get_active_window()
        if not win:
            return {'success': False, 'message': '窗口未初始化'}
        result = win.create_file_dialog(webview.FOLDER_DIALOG)
        if result and len(result) > 0:
            folder_path = result[0]
            images = []
            for filename in sorted(os.listdir(folder_path)):
                if filename.lower().endswith(VALID_IMAGE_EXTENSIONS):
                    path = os.path.join(folder_path, filename)
                    if os.path.isfile(path):
                        img_info = self._process_image(path, len(self.uploaded_images) + len(images))
                        if img_info:
                            images.append(img_info)
            self.uploaded_images.extend(images)
            return {'success': True, 'images': images, 'total': len(self.uploaded_images)}
        return {'success': False, 'message': '未选择文件夹'}

    def add_base64_images(self, items):
        """接收前端拖放或文件选择器读取的 base64 图片并同步到后端"""
        if not items:
            return {'success': False, 'message': '未提供图片数据'}
        used_names = {os.path.basename(img['path']).lower() for img in self.uploaded_images}
        added = []
        for item in items:
            try:
                raw_name = item.get('name') or 'image.png'
                preview = item.get('preview') or item.get('base64') or ''
                if ',' in preview:
                    preview = preview.split(',', 1)[1]
                data = base64.b64decode(preview)
                stem, ext = os.path.splitext(self._sanitize_filename(raw_name, 'image.png'))
                if not ext:
                    ext = '.png'
                unique_name = self._get_unique_filename(stem, ext, used_names)
                save_path = self._safe_join(self.upload_dir, unique_name)
                with open(save_path, 'wb') as fp:
                    fp.write(data)
                img_info = self._process_image(save_path, len(self.uploaded_images) + len(added), display_name=raw_name)
                if img_info:
                    added.append(img_info)
            except Exception as e:
                print(f"同步图片失败: {item.get('name')}, 错误: {e}")
        self.uploaded_images.extend(added)
        return {'success': True, 'images': added, 'total': len(self.uploaded_images)}

    def _process_image(self, path, img_id=None, display_name=None):
        """处理图片文件，返回图片信息与缩略图"""
        if img_id is None:
            img_id = len(self.uploaded_images)
        try:
            with Image.open(path) as img:
                thumb = img.copy()
                thumb.thumbnail((100, 100), Image.Resampling.LANCZOS)
                buffered = BytesIO()
                thumb.save(buffered, format='PNG')
                thumb.close()
                img_str = base64.b64encode(buffered.getvalue()).decode('ascii')

                raw_name = display_name if display_name else os.path.basename(path)
                return {
                    'id': img_id,
                    'path': path,
                    'name': self._sanitize_filename(raw_name, 'image.png'),
                    'preview': f'data:image/png;base64,{img_str}'
                }
        except Exception as e:
            print(f'处理图片失败: {path}, 错误: {e}')
            return None

    def clear_images(self):
        """清除所有已添加的图片"""
        self.uploaded_images = []
        return {'success': True, 'total': 0}

    def get_images(self):
        """获取当前已添加的图片列表（用于前后端状态同步）"""
        return {'success': True, 'images': self.uploaded_images, 'total': len(self.uploaded_images)}

    def remove_image(self, index):
        """移除指定索引的图片"""
        try:
            idx = int(index)
        except (ValueError, TypeError):
            return {'success': False, 'message': '索引无效'}
        if 0 <= idx < len(self.uploaded_images):
            self.uploaded_images.pop(idx)
            for i, img in enumerate(self.uploaded_images):
                img['id'] = i
            return {'success': True, 'total': len(self.uploaded_images)}
        return {'success': False, 'message': '索引无效'}

    def _create_bmp_ico(self, icon_images, output_path):
        """手动构建 ICO 文件：<=256px 采用标准 BMP(DIB) 格式，>256px 采用 PNG 流格式以避免体积膨胀与头部冲突"""
        ico_header = struct.pack('<HHH', 0, 1, len(icon_images))

        dir_entries = bytearray()
        image_data_list = []
        data_offset = 6 + 16 * len(icon_images)

        for img in icon_images:
            width_byte = img.width if img.width < 256 else 0
            height_byte = img.height if img.height < 256 else 0
            bpp = 32 if img.mode == 'RGBA' else 24

            if img.width > 256 or img.height > 256:
                # Windows Vista+ ICO 规范：大于 256px 的超高分辨率图标使用 PNG 流存储
                buf = BytesIO()
                img.save(buf, format='PNG')
                entry_data = buf.getvalue()
            else:
                if img.mode == 'RGBA':
                    entry_data = self._create_32bit_bmp(img)
                else:
                    entry_data = self._create_24bit_bmp(img)

            dir_entries.extend(struct.pack(
                '<BBBBHHII',
                width_byte,
                height_byte,
                0,
                0,
                1,
                bpp,
                len(entry_data),
                data_offset
            ))

            image_data_list.append(entry_data)
            data_offset += len(entry_data)

        with open(output_path, 'wb') as f:
            f.write(ico_header)
            f.write(dir_entries)
            for data in image_data_list:
                f.write(data)

    def _create_32bit_bmp(self, img):
        """创建 32 位 BMP 图像数据（BGRA 格式 + 1位透明 AND 掩码，采用 Pillow C 扩展加速）"""
        width, height = img.size
        flipped = img.convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM)

        # 使用 Pillow 原生 raw BGRA 编码替代 Python 双重循环（32位每行恒为 4 字节对齐）
        xor_mask = flipped.tobytes('raw', 'BGRA')

        # 构建 1 位 AND 掩码（alpha < 128 设为 1 表示透明，>= 128 设为 0 表示不透明）
        alpha = flipped.getchannel('A')
        mask_1bit = alpha.point(lambda a: 255 if a < 128 else 0, mode='1')
        raw_1bit = mask_1bit.tobytes()
        row_bytes = (width + 7) // 8
        and_row_size = ((width + 31) // 32) * 4
        pad_len = and_row_size - row_bytes

        if pad_len == 0:
            and_mask = raw_1bit
        else:
            pad_bytes = b'\x00' * pad_len
            and_rows = [
                raw_1bit[y * row_bytes:(y + 1) * row_bytes] + pad_bytes
                for y in range(height)
            ]
            and_mask = b''.join(and_rows)

        flipped.close()
        total_image_size = len(xor_mask) + len(and_mask)

        header = struct.pack(
            '<IiiHHIIiiII',
            40,
            width,
            height * 2,
            1,
            32,
            0,
            total_image_size,
            2835,
            2835,
            0,
            0
        )

        return header + xor_mask + and_mask

    def _create_24bit_bmp(self, img):
        """创建 24 位 BMP 图像数据（BGR 格式，采用 Pillow C 扩展加速）"""
        width, height = img.size
        flipped = img.convert('RGB').transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        raw_bgr = flipped.tobytes('raw', 'BGR')
        flipped.close()

        row_size = width * 3
        padding = (4 - row_size % 4) % 4

        if padding == 0:
            xor_mask = raw_bgr
        else:
            pad_bytes = b'\x00' * padding
            xor_rows = [
                raw_bgr[y * row_size:(y + 1) * row_size] + pad_bytes
                for y in range(height)
            ]
            xor_mask = b''.join(xor_rows)

        and_mask = bytes(height * ((width + 31) // 32) * 4)
        total_image_size = len(xor_mask) + len(and_mask)

        header = struct.pack(
            '<IiiHHIIiiII',
            40,
            width,
            height * 2,
            1,
            24,
            0,
            total_image_size,
            2835,
            2835,
            0,
            0
        )

        return header + xor_mask + and_mask

    @staticmethod
    def _resize_image(img, size, resize_mode, color_mode):
        """根据缩放模式和颜色模式调整图像尺寸（RGB 模式下自动在白色背景上合成透明度）"""
        if img.mode != 'RGBA':
            src = img.convert('RGBA')
            should_close_src = True
        else:
            src = img
            should_close_src = False

        try:
            if resize_mode == 'stretch':
                resized = src.resize((size, size), Image.Resampling.LANCZOS)
            elif resize_mode == 'fit':
                resized = Image.new('RGBA', (size, size), (0, 0, 0, 0))
                temp = src.copy()
                temp.thumbnail((size, size), Image.Resampling.LANCZOS)
                x = (size - temp.width) // 2
                y = (size - temp.height) // 2
                resized.paste(temp, (x, y), temp)
                temp.close()
            else:
                min_side = min(src.width, src.height)
                left = (src.width - min_side) // 2
                top = (src.height - min_side) // 2
                cropped = src.crop((left, top, left + min_side, top + min_side))
                resized = cropped.resize((size, size), Image.Resampling.LANCZOS)
                cropped.close()

            if color_mode == 'rgb':
                # 在白色背景上执行 Alpha 合成，避免透明区域及留白边变成纯黑色
                white_bg = Image.new('RGB', (size, size), (255, 255, 255))
                white_bg.paste(resized, (0, 0), resized)
                resized.close()
                return white_bg

            return resized
        finally:
            if should_close_src:
                src.close()

    def generate_ico(self, sizes, color_mode='rgba', resize_mode='cover'):
        """批量生成 ICO 文件"""
        if not self.uploaded_images:
            return {'success': False, 'message': '请先添加图片'}

        try:
            size_list = self._parse_sizes(sizes)
            if not size_list:
                return {'success': False, 'message': f'请选择至少一个有效尺寸（{MIN_ICON_SIZE}~{MAX_ICON_SIZE}px）'}

            results = []
            used_names = set()
            for img_info in self.uploaded_images:
                icon_images = []
                try:
                    with Image.open(img_info['path']) as img:
                        for size in size_list:
                            resized = self._resize_image(img, size, resize_mode, color_mode)
                            icon_images.append(resized)

                        stem = os.path.splitext(img_info['name'])[0]
                        output_name = self._get_unique_filename(stem, '.ico', used_names)
                        output_path = self._safe_join(self.temp_dir, output_name)
                        self._create_bmp_ico(icon_images, output_path)

                        with open(output_path, 'rb') as fp:
                            b64_data = base64.b64encode(fp.read()).decode('ascii')

                        results.append({
                            'name': output_name,
                            'path': output_path,
                            'sizes': size_list,
                            'format': 'ico',
                            'base64': b64_data
                        })
                finally:
                    for icon_img in icon_images:
                        icon_img.close()

            return {'success': True, 'files': results}
        except Exception as e:
            return {'success': False, 'message': f'生成失败: {str(e)}\n{traceback.format_exc()}'}

    def save_ico_from_base64(self, files):
        """从 base64 数据保存图标文件到用户选择的文件夹"""
        if not files:
            return {'success': False, 'message': '没有可保存的文件'}
        win = self._get_active_window()
        if not win:
            return {'success': False, 'message': '窗口未初始化'}
        result = win.create_file_dialog(webview.FOLDER_DIALOG)
        if not result or len(result) == 0:
            return {'success': False, 'message': '未选择保存位置'}
        folder = result[0]
        try:
            used_names = set()
            for f in files:
                raw_name = self._sanitize_filename(f.get('name', 'icon.ico'))
                stem, ext = os.path.splitext(raw_name)
                unique_name = self._get_unique_filename(stem, ext or '.ico', used_names)
                dst = self._safe_join(folder, unique_name)
                data = base64.b64decode(f['base64'])
                with open(dst, 'wb') as fp:
                    fp.write(data)
            return {'success': True, 'path': folder}
        except Exception as e:
            return {'success': False, 'message': f'保存失败: {str(e)}'}

    def save_zip_from_base64(self, base64_data, default_name='icons.zip'):
        """将前端打包的 ZIP base64 数据通过系统对话框保存到本地"""
        if not base64_data:
            return {'success': False, 'message': '没有可保存的 ZIP 数据'}
        win = self._get_active_window()
        if not win:
            return {'success': False, 'message': '窗口未初始化'}
        safe_default = self._sanitize_filename(default_name, 'icons.zip')
        result = win.create_file_dialog(
            webview.SAVE_DIALOG,
            save_filename=safe_default,
            file_types=('ZIP Archive (*.zip)',)
        )
        if not result:
            return {'success': False, 'message': '未选择保存位置'}
        dst = result[0] if isinstance(result, (list, tuple)) else result
        if not dst:
            return {'success': False, 'message': '未选择保存位置'}
        if not dst.lower().endswith('.zip'):
            dst += '.zip'
        try:
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]
            data = base64.b64decode(base64_data)
            with open(dst, 'wb') as fp:
                fp.write(data)
            return {'success': True, 'path': dst}
        except Exception as e:
            return {'success': False, 'message': f'保存失败: {str(e)}'}

    def save_ico(self, file_path, ico_files):
        """保存后端已生成的图标文件到指定目录"""
        try:
            used_names = set()
            for ico_file in ico_files:
                src_path = ico_file['path']
                raw_name = self._sanitize_filename(ico_file.get('name', os.path.basename(src_path)))
                stem, ext = os.path.splitext(raw_name)
                unique_name = self._get_unique_filename(stem, ext or '.ico', used_names)
                dst_path = self._safe_join(file_path, unique_name)
                shutil.copy2(src_path, dst_path)
            return {'success': True, 'path': file_path}
        except Exception as e:
            return {'success': False, 'message': f'保存失败: {str(e)}'}

    def package_zip(self, ico_files, save_path=None):
        """打包图标文件为 ZIP，可选保存到指定目录"""
        try:
            if save_path:
                zip_path = self._safe_join(save_path, 'icons.zip')
            else:
                zip_path = self._safe_join(self.temp_dir, 'icons.zip')

            used_names = set()
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for ico_file in ico_files:
                    raw_name = self._sanitize_filename(ico_file.get('name', 'icon.ico'))
                    stem, ext = os.path.splitext(raw_name)
                    arcname = self._get_unique_filename(stem, ext or '.ico', used_names)
                    zf.write(ico_file['path'], arcname)
            return {'success': True, 'path': zip_path}
        except Exception as e:
            return {'success': False, 'message': f'打包失败: {str(e)}'}

    def select_save_folder(self):
        """选择保存文件夹"""
        win = self._get_active_window()
        if not win:
            return {'success': False, 'message': '窗口未初始化'}
        result = win.create_file_dialog(webview.FOLDER_DIALOG)
        if result and len(result) > 0:
            return {'success': True, 'path': result[0]}
        return {'success': False, 'message': '未选择文件夹'}

    def cleanup(self):
        """清理临时文件"""
        try:
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir, ignore_errors=True)
        except Exception:
            pass

    def get_os_type(self):
        """获取当前操作系统类型"""
        system = platform.system().lower()
        if system == 'windows':
            return 'win32'
        elif system == 'darwin':
            return 'darwin'
        return 'linux'

    def _create_icns(self, icon_images, output_path):
        """构建 ICNS 格式图标文件"""
        size_to_type = {
            16: b'icp4',
            32: b'icp5',
            64: b'icp6',
            128: b'ic07',
            256: b'ic08',
            512: b'ic09',
            1024: b'ic10',
        }

        entries = bytearray()
        data_entries = []

        for img in icon_images:
            size = img.width
            icon_type = size_to_type.get(size)
            if not icon_type:
                continue

            buf = BytesIO()
            if img.mode not in ('RGB', 'RGBA'):
                png_img = img.convert('RGBA')
                png_img.save(buf, format='PNG')
                png_img.close()
            else:
                img.save(buf, format='PNG')
            png_data = buf.getvalue()

            entry_header = icon_type + struct.pack('>I', 8 + len(png_data))
            entries.extend(entry_header)
            data_entries.append(png_data)

        total_size = 8 + len(entries) + sum(len(d) for d in data_entries)
        icns_data = bytearray()
        icns_data.extend(b'icns')
        icns_data.extend(struct.pack('>I', total_size))
        icns_data.extend(entries)
        for data in data_entries:
            icns_data.extend(data)

        with open(output_path, 'wb') as f:
            f.write(icns_data)

    def generate_icns(self, sizes, color_mode='rgba', resize_mode='cover'):
        """批量生成 ICNS 文件"""
        if not self.uploaded_images:
            return {'success': False, 'message': '请先添加图片'}

        try:
            size_list = self._parse_sizes(sizes, valid_set=set(ICNS_SUPPORTED_SIZES))
            if not size_list:
                return {'success': False, 'message': 'ICNS 格式仅支持 16, 32, 64, 128, 256, 512, 1024 尺寸'}

            results = []
            used_names = set()
            for img_info in self.uploaded_images:
                icon_images = []
                try:
                    with Image.open(img_info['path']) as img:
                        for size in size_list:
                            resized = self._resize_image(img, size, resize_mode, color_mode)
                            icon_images.append(resized)

                        stem = os.path.splitext(img_info['name'])[0]
                        output_name = self._get_unique_filename(stem, '.icns', used_names)
                        output_path = self._safe_join(self.temp_dir, output_name)
                        self._create_icns(icon_images, output_path)

                        with open(output_path, 'rb') as fp:
                            b64_data = base64.b64encode(fp.read()).decode('ascii')

                        results.append({
                            'name': output_name,
                            'path': output_path,
                            'sizes': size_list,
                            'format': 'icns',
                            'base64': b64_data
                        })
                finally:
                    for icon_img in icon_images:
                        icon_img.close()

            return {'success': True, 'files': results}
        except Exception as e:
            return {'success': False, 'message': f'生成失败: {str(e)}\n{traceback.format_exc()}'}


def get_center_position(width, height):
    """计算窗口居中位置（跨平台，兼容 Windows High-DPI 缩放）"""
    system = platform.system()
    try:
        if system == 'Windows':
            import ctypes
            try:
                ctypes.windll.shcore.SetProcessDpiAwareness(1)
            except Exception:
                try:
                    ctypes.windll.user32.SetProcessDPIAware()
                except Exception:
                    pass
            user32 = ctypes.windll.user32
            screen_width = user32.GetSystemMetrics(0)
            screen_height = user32.GetSystemMetrics(1)
        elif system == 'Darwin':
            try:
                from AppKit import NSScreen
                frame = NSScreen.mainScreen().frame()
                screen_width = int(frame.size.width)
                screen_height = int(frame.size.height)
            except ImportError:
                import tkinter as tk
                root = tk.Tk()
                root.withdraw()
                screen_width = root.winfo_screenwidth()
                screen_height = root.winfo_screenheight()
                root.destroy()
        else:
            import tkinter as tk
            root = tk.Tk()
            root.withdraw()
            screen_width = root.winfo_screenwidth()
            screen_height = root.winfo_screenheight()
            root.destroy()

        x = max(0, (screen_width - width) // 2)
        y = max(0, (screen_height - height) // 2)
        return x, y
    except Exception:
        return 100, 100


def main():
    if webview is None:
        raise RuntimeError('未安装 pywebview，请先运行: pip install -r requirements.txt')

    api = Api()

    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(base_path, 'web', 'index.html')

    window_width = 1200
    window_height = 800
    x, y = get_center_position(window_width, window_height)

    window = webview.create_window(
        'ICO 生成器',
        html_path,
        js_api=api,
        width=window_width,
        height=window_height,
        x=x,
        y=y,
        resizable=False,
        frameless=True,
        easy_drag=True
    )
    api.set_window(window)

    webview.start(debug=False)
    api.cleanup()


if __name__ == '__main__':
    main()
