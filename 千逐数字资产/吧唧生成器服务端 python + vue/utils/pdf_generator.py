# utils/pdf_generator.py - PDF生成工具
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image
import os
from datetime import datetime

class PDFGenerator:
    def __init__(self):
        self.page_size = A4
        self.margin = 20 * mm
        
    def _get_layout_config(self, format_type, baji_size):
        """获取布局配置"""
        # 解析吧唧尺寸
        size_parts = baji_size.split('x')
        if len(size_parts) != 2:
            size_parts = ['68', '68']  # 默认尺寸
        
        width_mm = float(size_parts[0])
        height_mm = float(size_parts[1])
        
        # 转换为PDF单位
        baji_width = width_mm * mm
        baji_height = height_mm * mm
        
        # 根据格式类型设置布局（修复：默认应该是3行2列纵向排列）
        layout_configs = {
            'a4_6': {'items_per_page': 6, 'items_per_row': 2, 'items_per_col': 3},  # 3行2列
            'a4_9': {'items_per_page': 9, 'items_per_row': 3, 'items_per_col': 3},  # 3行3列
            'a4_12': {'items_per_page': 12, 'items_per_row': 3, 'items_per_col': 4}, # 3行4列
            'a4_16': {'items_per_page': 16, 'items_per_row': 4, 'items_per_col': 4}  # 4行4列
        }
        
        config = layout_configs.get(format_type, layout_configs['a4_6'])
        
        # 计算间距
        available_width = self.page_size[0] - 2 * self.margin
        available_height = self.page_size[1] - 2 * self.margin
        
        # 计算水平和垂直间距
        h_spacing = (available_width - config['items_per_row'] * baji_width) / (config['items_per_row'] - 1) if config['items_per_row'] > 1 else 0
        v_spacing = (available_height - config['items_per_col'] * baji_height) / (config['items_per_col'] - 1) if config['items_per_col'] > 1 else 0
        
        return {
            'baji_size': (baji_width, baji_height),
            'items_per_page': config['items_per_page'],
            'items_per_row': config['items_per_row'],
            'items_per_col': config['items_per_col'],
            'h_spacing': h_spacing,
            'v_spacing': v_spacing
        }
        
    def generate_baji_pdf(self, order_ids, format_type='a4_6', baji_size='68x68'):
        """生成吧唧PDF"""
        try:
            from utils.models import Order
            
            # 获取订单
            orders = Order.query.filter(Order.id.in_(order_ids)).all()
            if not orders:
                raise Exception("没有找到订单")
            
            # 确保导出目录存在
            import os
            from flask import current_app
            
            # 获取项目根目录
            if hasattr(current_app, 'root_path'):
                project_root = os.path.dirname(current_app.root_path)
            else:
                project_root = os.getcwd()
            
            export_dir = os.path.join(project_root, 'static', 'exports')
            os.makedirs(export_dir, exist_ok=True)
            
            # 生成PDF文件路径
            pdf_filename = f"baji_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = os.path.join(export_dir, pdf_filename)
            
            # 获取布局配置
            layout = self._get_layout_config(format_type, baji_size)
            
            # 创建PDF
            c = canvas.Canvas(pdf_path, pagesize=self.page_size)
            
            current_page = 0
            current_item = 0
            
            for order in orders:
                # 检查是否需要新页面
                if current_item % layout['items_per_page'] == 0:
                    if current_page > 0:
                        c.showPage()
                    current_page += 1
                
                # 计算位置
                item_in_page = current_item % layout['items_per_page']
                row = item_in_page // layout['items_per_col']  # 除以列数得到行
                col = item_in_page % layout['items_per_col']   # 模列数得到列
                
                # 计算坐标
                x = self.margin + col * (layout['baji_size'][0] + layout['h_spacing'])
                y = self.page_size[1] - self.margin - (row + 1) * (layout['baji_size'][1] + layout['v_spacing'])
                
                # 绘制吧唧
                self.draw_baji(c, order, x, y, layout['baji_size'])
                
                current_item += 1
            
            c.save()
            return pdf_path
            
        except Exception as e:
            raise Exception(f"生成PDF失败: {str(e)}")
    
    def draw_baji(self, canvas, order, x, y, baji_size):
        """绘制单个吧唧"""
        try:
            # 绘制边框
            canvas.rect(x, y, baji_size[0], baji_size[1])
            
            # 绘制图片
            if order.processed_image_path and os.path.exists(order.processed_image_path):
                try:
                    # 使用PIL处理图片，确保正确的尺寸和格式
                    from PIL import Image
                    pil_image = Image.open(order.processed_image_path)
                    
                    # 转换为RGB模式（PDF需要）
                    if pil_image.mode != 'RGB':
                        pil_image = pil_image.convert('RGB')
                    
                    # 调整图片尺寸以适应吧唧尺寸
                    pil_image = pil_image.resize((int(baji_size[0]), int(baji_size[1])), Image.Resampling.LANCZOS)
                    
                    # 创建临时文件
                    import tempfile
                    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                    pil_image.save(temp_file.name, 'JPEG', quality=95)
                    temp_file.close()
                    
                    # 绘制图片
                    img = ImageReader(temp_file.name)
                    canvas.drawImage(img, x, y, width=baji_size[0], height=baji_size[1])
                    
                    # 清理临时文件
                    os.unlink(temp_file.name)
                    
                except Exception as img_error:
                    # 如果图片处理失败，绘制占位符
                    canvas.setFont("Helvetica", 10)
                    canvas.drawString(x + 5, y + baji_size[1]/2, "图片加载失败")
            else:
                # 绘制占位符
                canvas.setFont("Helvetica", 10)
                canvas.drawString(x + 5, y + baji_size[1]/2, "无图片")
            
            # 绘制订单号
            canvas.setFont("Helvetica", 8)
            canvas.drawString(x + 2, y - 10, f"订单: {order.order_no}")
            
        except Exception as e:
            raise Exception(f"绘制吧唧失败: {str(e)}")
    
    def generate_invoice(self, order):
        """生成发票PDF"""
        try:
            pdf_filename = f"invoice_{order.order_no}.pdf"
            pdf_path = os.path.join('static', 'exports', pdf_filename)
            
            c = canvas.Canvas(pdf_path, pagesize=A4)
            
            # 绘制发票内容
            c.setFont("Helvetica-Bold", 16)
            c.drawString(100, 750, "吧唧生成器 - 发票")
            
            c.setFont("Helvetica", 12)
            c.drawString(100, 700, f"订单号: {order.order_no}")
            c.drawString(100, 680, f"创建时间: {order.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
            c.drawString(100, 660, f"数量: {order.quantity}")
            c.drawString(100, 640, f"单价: ¥{order.unit_price}")
            c.drawString(100, 620, f"总价: ¥{order.total_price}")
            c.drawString(100, 600, f"支付状态: {order.payment_status}")
            
            c.save()
            return pdf_path
            
        except Exception as e:
            raise Exception(f"生成发票失败: {str(e)}")
    
    def generate_delivery_label(self, delivery):
        """生成配送标签PDF"""
        try:
            pdf_filename = f"delivery_label_{delivery.delivery_no}.pdf"
            pdf_path = os.path.join('static', 'exports', pdf_filename)
            
            c = canvas.Canvas(pdf_path, pagesize=A4)
            
            # 绘制配送标签内容
            c.setFont("Helvetica-Bold", 16)
            c.drawString(100, 750, "配送标签")
            
            c.setFont("Helvetica", 12)
            c.drawString(100, 700, f"配送单号: {delivery.delivery_no}")
            c.drawString(100, 680, f"收件人: {delivery.recipient_name}")
            c.drawString(100, 660, f"电话: {delivery.phone}")
            c.drawString(100, 640, f"地址: {delivery.address}")
            if delivery.tracking_number:
                c.drawString(100, 620, f"快递单号: {delivery.tracking_number}")
            
            c.save()
            return pdf_path
            
        except Exception as e:
            raise Exception(f"生成配送标签失败: {str(e)}")
    
    def generate_delivery_list_pdf(self, delivery_ids):
        """生成配送单列表PDF"""
        try:
            from utils.models import Delivery
            
            # 获取配送记录
            deliveries = Delivery.query.filter(Delivery.id.in_(delivery_ids)).all()
            if not deliveries:
                raise Exception("没有找到配送记录")
            
            # 生成PDF文件路径
            pdf_filename = f"delivery_list_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = os.path.join('static', 'exports', pdf_filename)
            
            # 创建PDF
            c = canvas.Canvas(pdf_path, pagesize=A4)
            
            # 绘制标题
            c.setFont("Helvetica-Bold", 16)
            c.drawString(100, 750, "配送单列表")
            
            # 绘制配送记录
            y_position = 700
            c.setFont("Helvetica", 10)
            
            for delivery in deliveries:
                if y_position < 100:  # 换页
                    c.showPage()
                    y_position = 750
                
                c.drawString(100, y_position, f"配送单号: {delivery.delivery_no}")
                c.drawString(100, y_position - 20, f"收件人: {delivery.recipient_name}")
                c.drawString(100, y_position - 40, f"电话: {delivery.phone}")
                c.drawString(100, y_position - 60, f"地址: {delivery.address}")
                c.drawString(100, y_position - 80, f"状态: {delivery.status}")
                
                y_position -= 120
            
            c.save()
            return pdf_path
            
        except Exception as e:
            raise Exception(f"生成配送单列表失败: {str(e)}")
    
    def generate_preview(self, order_ids, pdf_format='a4_6'):
        """生成预览PDF"""
        try:
            # 生成预览PDF文件路径
            pdf_filename = f"preview_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            pdf_path = os.path.join('static', 'exports', pdf_filename)
            
            # 创建PDF
            c = canvas.Canvas(pdf_path, pagesize=self.page_size)
            
            # 绘制预览内容
            c.setFont("Helvetica-Bold", 16)
            c.drawString(100, 750, "打印预览")
            
            c.setFont("Helvetica", 12)
            c.drawString(100, 700, f"订单数量: {len(order_ids)}")
            c.drawString(100, 680, f"格式: {pdf_format}")
            c.drawString(100, 660, f"吧唧尺寸: 68mm x 68mm")
            
            # 绘制预览网格
            c.setFont("Helvetica", 10)
            c.drawString(100, 600, "预览布局:")
            
            # 绘制6个预览框（3行2列布局）
            for i in range(6):
                row = i // 2  # 除以列数得到行
                col = i % 2   # 模列数得到列
                
                x = 100 + col * 80
                y = 550 - row * 80
                
                # 绘制预览框
                c.rect(x, y, 70, 70)
                c.drawString(x + 5, y - 10, f"预览 {i+1}")
            
            c.save()
            return pdf_path
            
        except Exception as e:
            raise Exception(f"生成预览失败: {str(e)}")