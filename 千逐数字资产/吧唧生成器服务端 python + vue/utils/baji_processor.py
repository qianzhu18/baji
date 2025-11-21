# utils/baji_processor.py - 吧唧处理器
from PIL import Image, ImageOps, ImageFilter, ImageDraw
import math
import os
from flask import current_app

class BajiProcessor:
    """吧唧处理器类 - 完美复现前端效果"""
    
    def __init__(self, parameters):
        self.params = parameters
        self.validate_parameters()
        
    def validate_parameters(self):
        """验证参数完整性"""
        # 检查基本参数
        if not self.get_nested_value('image.original_path'):
            raise ValueError("Missing required parameter: image.original_path")
        
        # 为edit_params提供默认值
        edit_params = self.params.get('edit_params', {})
        if 'scale' not in edit_params:
            edit_params['scale'] = 1.0
        if 'rotation' not in edit_params:
            edit_params['rotation'] = 0
        if 'offset_x' not in edit_params:
            edit_params['offset_x'] = 0
        if 'offset_y' not in edit_params:
            edit_params['offset_y'] = 0
        
        self.params['edit_params'] = edit_params
    
    def get_nested_value(self, path):
        """获取嵌套字典值"""
        keys = path.split('.')
        value = self.params
        for key in keys:
            value = value.get(key)
            if value is None:
                return None
        return value
    
    def process_image(self):
        """处理图片，完全复现前端Canvas效果 - 新版本基于设计模式和打印模式"""
        # 获取图片路径并处理相对路径
        image_path = self.params['image']['original_path']
        if not os.path.isabs(image_path):
            # 如果是相对路径，尝试在uploads目录中查找
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'static/uploads')
            full_path = os.path.join(upload_folder, image_path)
            if os.path.exists(full_path):
                image_path = full_path
            elif os.path.exists(image_path):
                # 如果相对路径存在，使用它
                pass
            else:
                raise FileNotFoundError(f"图片文件不存在: {image_path}")
        
        # 加载原始图片
        original_image = Image.open(image_path)
        
        
        # 转换为RGBA模式以支持透明度
        if original_image.mode != 'RGBA':
            if original_image.mode == 'P':
                original_image = original_image.convert('RGBA')
            else:
                # 创建白色背景
                background = Image.new('RGBA', original_image.size, (255, 255, 255, 255))
                if original_image.mode == 'RGB':
                    original_image = original_image.convert('RGBA')
            background.paste(original_image, mask=original_image.split()[-1] if original_image.mode == 'RGBA' else None)
            original_image = background
        
        # 获取编辑参数
        edit_params = self.params['edit_params']
        scale = edit_params['scale']
        rotation = edit_params['rotation']
        offset_x = edit_params['offset_x']
        offset_y = edit_params['offset_y']
        
        # 获取Canvas真实宽度331（前端传递）
        canvas_client_width = edit_params.get('canvas_client_width', 331)
        canvas_client_height = edit_params.get('canvas_client_height', 331)
        canvas_size = min(canvas_client_width, canvas_client_height)
        
        print(f"🔍 新的处理逻辑 - 基于设计模式和打印模式:")
        print(f"  Canvas真实宽度: {canvas_client_width}x{canvas_client_height}")
        print(f"  Canvas尺寸: {canvas_size}")
        print(f"  用户缩放比例: {scale}")
        print(f"  旋转角度: {rotation}")
        print(f"  偏移: ({offset_x}, {offset_y})")
        
        # 设计模式的数据计算 - 按照用户精确要求
        # Canvas真实宽度331，缩放0.6时，可视区域大小 = 331/0.6 = 551.67
        # 半可视区域 = 275.83
        # 原图中心点512x512，裁切区域 = 512-275.83 到 512+275.83
        
        img_width, img_height = original_image.size
        original_center_x = img_width / 2
        original_center_y = img_height / 2
        
        # 计算可视区域大小（基于Canvas真实宽度331）
        visible_area_size = canvas_size / scale  # 331 / 0.6 = 551.67
        half_visible_area = visible_area_size / 2  # 275.83
        
        # 计算设计模式的裁切区域（考虑偏移和旋转）
        # 偏移是相对于Canvas的像素偏移，需要转换为相对于原图的偏移
        # Canvas显示区域大小 = canvas_size，原图对应区域大小 = visible_area_size
        # 注意：前端向右拖拽时，图片向右移动，但裁切区域应该向左移动来显示图片的右侧部分
        # 重要：前端的变换顺序是 translate -> rotate -> scale，所以偏移会受到旋转影响
        
        offset_scale_factor = visible_area_size / canvas_size
        
        # 简化偏移计算：既然我们已经先旋转图片，再在旋转后的图片上应用偏移
        # 那么偏移计算应该基于旋转后的坐标系，直接应用偏移即可
        # 不需要复杂的反向旋转计算，因为图片已经旋转了
        image_offset_x = -offset_x * offset_scale_factor
        image_offset_y = -offset_y * offset_scale_factor
        
        print(f"🔍 简化偏移计算:")
        print(f"  原始Canvas偏移: ({offset_x}, {offset_y})")
        print(f"  缩放因子: {offset_scale_factor}")
        print(f"  旋转角度: {rotation}°")
        print(f"  最终图片偏移: ({image_offset_x}, {image_offset_y})")
        
        design_crop_center_x = original_center_x + image_offset_x
        design_crop_center_y = original_center_y + image_offset_y
        
        # 设计模式裁切区域
        design_crop_left = design_crop_center_x - half_visible_area
        design_crop_top = design_crop_center_y - half_visible_area
        design_crop_right = design_crop_center_x + half_visible_area
        design_crop_bottom = design_crop_center_y + half_visible_area
        
        # 确保裁切区域不超出原图边界
        actual_design_crop_left = max(0, design_crop_left)
        actual_design_crop_top = max(0, design_crop_top)
        actual_design_crop_right = min(img_width, design_crop_right)
        actual_design_crop_bottom = min(img_height, design_crop_bottom)
        
        design_crop_width = actual_design_crop_right - actual_design_crop_left
        design_crop_height = actual_design_crop_bottom - actual_design_crop_top
        
        print(f"🔍 设计模式数据计算:")
        print(f"  Canvas真实宽度: {canvas_size}")
        print(f"  缩放比例: {scale}")
        print(f"  可视区域大小: {visible_area_size}")
        print(f"  半可视区域: {half_visible_area}")
        print(f"  原始图片尺寸: {img_width}x{img_height}")
        print(f"  原始中心点: ({original_center_x}, {original_center_y})")
        print(f"  Canvas偏移: ({offset_x}, {offset_y})")
        print(f"  图片偏移: ({image_offset_x}, {image_offset_y})")
        print(f"  设计裁切中心: ({design_crop_center_x}, {design_crop_center_y})")
        print(f"  设计裁切区域: ({design_crop_left}, {design_crop_top}) 到 ({design_crop_right}, {design_crop_bottom})")
        print(f"  实际设计裁切区域: ({actual_design_crop_left}, {actual_design_crop_top}) 到 ({actual_design_crop_right}, {actual_design_crop_bottom})")
        print(f"  设计裁切尺寸: {design_crop_width}x{design_crop_height}")
        
        # 正确的处理顺序：先旋转，再偏移，最后裁切
        # 这样才符合前端的变换顺序：translate -> rotate -> scale -> drawImage
        
        # 步骤1: 先对完整图片进行旋转
        if rotation != 0:
            # PIL的rotate是逆时针，Canvas的rotate是顺时针，所以需要取反
            rotated_image = original_image.rotate(-rotation, expand=True, fillcolor=(255, 255, 255, 255))
        else:
            rotated_image = original_image
        
        
        # 步骤2: 在旋转后的图片上计算偏移和裁切
        # 重新计算旋转后图片的尺寸和中心点
        rotated_width, rotated_height = rotated_image.size
        rotated_center_x = rotated_width / 2
        rotated_center_y = rotated_height / 2
        
        # 重新计算偏移（基于旋转后的图片）
        # 既然我们已经先旋转了图片，偏移计算应该基于旋转后的图片坐标系
        # 不需要调换X和Y，直接使用计算出的偏移值
        rotated_offset_x = image_offset_x
        rotated_offset_y = image_offset_y
        
        print(f"🔍 旋转后偏移应用:")
        print(f"  计算出的偏移: ({image_offset_x}, {image_offset_y})")
        print(f"  旋转角度: {rotation}°")
        print(f"  应用到旋转后图片: ({rotated_offset_x}, {rotated_offset_y})")
        
        # 计算旋转后图片的裁切中心
        rotated_crop_center_x = rotated_center_x + rotated_offset_x
        rotated_crop_center_y = rotated_center_y + rotated_offset_y
        
        # 计算旋转后图片的裁切区域
        rotated_crop_left = rotated_crop_center_x - half_visible_area
        rotated_crop_top = rotated_crop_center_y - half_visible_area
        rotated_crop_right = rotated_crop_center_x + half_visible_area
        rotated_crop_bottom = rotated_crop_center_y + half_visible_area
        
        # 确保裁切区域不超出旋转后图片边界
        actual_rotated_crop_left = max(0, rotated_crop_left)
        actual_rotated_crop_top = max(0, rotated_crop_top)
        actual_rotated_crop_right = min(rotated_width, rotated_crop_right)
        actual_rotated_crop_bottom = min(rotated_height, rotated_crop_bottom)
        
        # 步骤3: 从旋转后的图片中裁切出最终区域
        design_crop = rotated_image.crop((actual_rotated_crop_left, actual_rotated_crop_top, actual_rotated_crop_right, actual_rotated_crop_bottom))
        
        
        # 更新变量名以保持兼容性
        rotated_design = design_crop
        
        # 打印模式的数据计算 - 按照用户精确要求
        # 对275.83这个图片高度加上68mm中多出的部分 = 275.83 * 68/58 = 323.33
        # 打印裁切区域 = 512-323.33 到 512+323.33
        
        # 打印模式也使用相同的处理顺序：先旋转，再偏移，最后裁切
        # 计算打印模式的裁切区域（基于旋转后的图片）
        print_crop_half = half_visible_area * 68 / 58  # 275.83 * 68/58 = 323.33
        
        # 在旋转后的图片上计算打印模式的裁切区域
        print_crop_center_x = rotated_center_x + rotated_offset_x
        print_crop_center_y = rotated_center_y + rotated_offset_y
        
        # 打印模式裁切区域
        print_crop_left = print_crop_center_x - print_crop_half
        print_crop_top = print_crop_center_y - print_crop_half
        print_crop_right = print_crop_center_x + print_crop_half
        print_crop_bottom = print_crop_center_y + print_crop_half
        
        # 确保打印裁切区域不超出旋转后图片边界
        actual_print_crop_left = max(0, print_crop_left)
        actual_print_crop_top = max(0, print_crop_top)
        actual_print_crop_right = min(rotated_width, print_crop_right)
        actual_print_crop_bottom = min(rotated_height, print_crop_bottom)
        
        print_crop_width = actual_print_crop_right - actual_print_crop_left
        print_crop_height = actual_print_crop_bottom - actual_print_crop_top
        
        print(f"🔍 打印模式数据计算:")
        print(f"  打印裁切半区域: {print_crop_half}")
        print(f"  旋转后图片尺寸: {rotated_width}x{rotated_height}")
        print(f"  旋转后图片中心: ({rotated_center_x}, {rotated_center_y})")
        print(f"  打印裁切中心: ({print_crop_center_x}, {print_crop_center_y})")
        print(f"  打印裁切区域: ({print_crop_left}, {print_crop_top}) 到 ({print_crop_right}, {print_crop_bottom})")
        print(f"  实际打印裁切区域: ({actual_print_crop_left}, {actual_print_crop_top}) 到 ({actual_print_crop_right}, {actual_print_crop_bottom})")
        print(f"  打印裁切尺寸: {print_crop_width}x{print_crop_height}")
        
        # 从旋转后的图片中裁切出打印区域
        print_crop = rotated_image.crop((actual_print_crop_left, actual_print_crop_top, actual_print_crop_right, actual_print_crop_bottom))
        
        
        # 生成最终图片 - 按照用户精确要求
        # 预览图: 342x342像素 (58mm at 150 DPI)
        # 打印图: 402x402像素 (68mm at 150 DPI)
        
        preview_size = 342  # 58mm at 150 DPI
        print_size = 402    # 68mm at 150 DPI
        
        # 生成预览图片（从设计模式裁切生成）
        preview_image = rotated_design.resize((preview_size, preview_size), Image.Resampling.LANCZOS)
        
        # 生成打印图片（从打印模式裁切生成）
        print_image = print_crop.resize((print_size, print_size), Image.Resampling.LANCZOS)
        
        # 使用文件管理器获取基于日期的导出路径
        from utils.file_manager import file_manager
        
        # 保存预览图片
        preview_filename = f"preview_{os.path.basename(image_path).split('.')[0]}.png"
        preview_path = file_manager.get_dated_export_path(preview_filename)
        preview_image.save(preview_path, 'PNG')
        print(f"🔍 预览图片已保存: {preview_path} (尺寸: {preview_size}x{preview_size})")
        
        # 保存打印图片
        print_filename = f"print_{os.path.basename(image_path).split('.')[0]}.png"
        print_path = file_manager.get_dated_export_path(print_filename)
        print_image.save(print_path, 'PNG')
        print(f"🔍 打印图片已保存: {print_path} (尺寸: {print_size}x{print_size})")
        
        # 应用用户偏好到打印图片
        user_prefs = self.params.get('user_preferences', {})
        
        if user_prefs.get('color_correction', True):
            # 只对非透明区域应用颜色校正
            if print_image.mode == 'RGBA':
                # 分离RGB和Alpha通道
                rgb_image = Image.new('RGB', print_image.size, (255, 255, 255))
                rgb_image.paste(print_image, mask=print_image.split()[-1])
                rgb_image = ImageOps.autocontrast(rgb_image)
                # 重新组合
                print_image = Image.merge('RGBA', (*rgb_image.split(), print_image.split()[-1]))
            else:
                print_image = ImageOps.autocontrast(print_image)
        
        if user_prefs.get('sharpening', False):
            print_image = print_image.filter(ImageFilter.SHARPEN)
        
        # 重新保存处理后的打印图片
        print_image.save(print_path, 'PNG')
        
        # 返回打印图片作为主要结果
        return print_image
    
    def save_processed_image(self, output_path):
        """保存处理后的图片"""
        processed_image = self.process_image()
        
        # 获取保存参数
        baji_specs = self.params.get('baji_specs', {})
        format = baji_specs.get('format', 'PNG')
        quality = baji_specs.get('quality', 95)
        
        if format.upper() == 'JPEG':
            processed_image.save(output_path, format, quality=quality, optimize=True)
        else:
            processed_image.save(output_path, format, optimize=True)
        
        # 同时生成预览图片（小尺寸，和设计效果一致）
        preview_size = 200
        preview_image = processed_image.resize((preview_size, preview_size), Image.Resampling.LANCZOS)
        
        # 保存预览图片
        preview_filename = f"preview_{os.path.basename(output_path).split('.')[0]}.png"
        preview_path = os.path.join(os.path.dirname(output_path), preview_filename)
        preview_image.save(preview_path, 'PNG')
        print(f"🔍 预览图片已保存: {preview_path}")
        
        return output_path, preview_path
