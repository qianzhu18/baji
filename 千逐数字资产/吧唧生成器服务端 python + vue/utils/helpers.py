# utils/helpers.py - 工具函数
import os
import uuid
import stat
from datetime import datetime
from flask import current_app
from werkzeug.utils import secure_filename

def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def generate_unique_filename(original_filename):
    """生成唯一文件名"""
    filename = secure_filename(original_filename)
    if not filename:
        return None
    
    # 添加时间戳避免重名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    name, ext = os.path.splitext(filename)
    return f"{timestamp}_{name}_{uuid.uuid4().hex[:8]}{ext}"

def ensure_directories():
    """确保必要的目录存在"""
    upload_folder = current_app.config['UPLOAD_FOLDER']
    export_folder = current_app.config['EXPORT_FOLDER']
    
    os.makedirs(upload_folder, exist_ok=True)
    os.makedirs(export_folder, exist_ok=True)
    
    # 设置目录权限（仅所有者可读写执行）
    # 在Docker容器中，如果目录是挂载的卷，可能无法修改权限，所以使用try-except处理
    try:
        os.chmod(upload_folder, stat.S_IRWXU)
    except PermissionError:
        # 如果是挂载的卷，权限可能无法修改，这是正常的
        pass
    
    try:
        os.chmod(export_folder, stat.S_IRWXU)
    except PermissionError:
        # 如果是挂载的卷，权限可能无法修改，这是正常的
        pass

def save_file_with_permissions(file_obj, file_path):
    """保存文件并设置安全权限"""
    file_obj.save(str(file_path))
    
    # 设置文件权限 (仅所有者可读写)
    # 在Docker容器中，如果文件在挂载的卷中，可能无法修改权限，所以使用try-except处理
    try:
        os.chmod(file_path, stat.S_IRUSR | stat.S_IWUSR)
    except PermissionError:
        # 如果是挂载的卷，权限可能无法修改，这是正常的
        pass
    
    return file_path

def validate_image_file(file):
    """验证图片文件"""
    if not file or file.filename == '':
        return False, '没有选择文件'
    
    if not allowed_file(file.filename):
        return False, '不支持的文件格式'
    
    # 检查文件大小
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # 重置文件指针
    
    max_size = current_app.config['MAX_CONTENT_LENGTH']
    if file_size > max_size:
        return False, f'文件太大，请选择小于{max_size // (1024*1024)}MB的图片'
    
    if file_size == 0:
        return False, '文件为空'
    
    # 检查文件头（MIME类型验证）
    try:
        file_content = file.read(1024)
        file.seek(0)  # 重置文件指针
        
        # 检查常见图片文件头
        image_headers = {
            b'\xff\xd8\xff': 'JPEG',
            b'\x89PNG\r\n\x1a\n': 'PNG',
            b'RIFF': 'WEBP',  # WEBP文件以RIFF开头
            b'GIF87a': 'GIF',
            b'GIF89a': 'GIF'
        }
        
        is_valid_image = False
        for header, format_name in image_headers.items():
            if file_content.startswith(header):
                is_valid_image = True
                break
        
        if not is_valid_image:
            return False, '不是有效的图片文件'
        
        # 尝试使用PIL验证图片
        try:
            from PIL import Image
            img = Image.open(file)
            img.verify()
            file.seek(0)  # 重置文件指针
            
            # 检查图片尺寸
            max_size = current_app.config.get('MAX_IMAGE_SIZE', (2048, 2048))
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                return False, f'图片尺寸过大，最大支持{max_size[0]}x{max_size[1]}像素'
                
        except Exception as e:
            return False, f'图片文件验证失败: {str(e)}'
        
        return True, None
        
    except Exception as e:
        return False, f'文件验证失败: {str(e)}'

def get_file_info(file_path):
    """获取文件信息"""
    if not os.path.exists(file_path):
        return None
    
    try:
        from PIL import Image
        with Image.open(file_path) as img:
            return {
                'width': img.width,
                'height': img.height,
                'format': img.format.lower() if img.format else 'unknown',
                'size': os.path.getsize(file_path)
            }
    except Exception:
        return None
