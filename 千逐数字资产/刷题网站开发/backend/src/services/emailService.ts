import nodemailer from 'nodemailer';
import { logger } from '@/utils/logger';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
  html?: string;
}

class EmailService {
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.createTransporter();
  }

  private createTransporter(): void {
    if (process.env.NODE_ENV === 'development') {
      // 开发环境使用 Ethereal Email (测试邮箱)
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        }
      });
    } else {
      // 生产环境使用真实SMTP
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }

    // 验证连接配置
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('邮件服务配置错误:', error);
      } else {
        logger.info('邮件服务已准备就绪');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `${process.env.FROM_NAME || '智能题库系统'} <${process.env.FROM_EMAIL || 'noreply@quizsystem.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || options.message
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info('邮件发送成功 (开发环境)', {
          messageId: info.messageId,
          previewURL: nodemailer.getTestMessageUrl(info)
        });
      } else {
        logger.info('邮件发送成功', {
          messageId: info.messageId,
          to: options.email
        });
      }
    } catch (error) {
      logger.error('邮件发送失败:', error);
      throw new Error('邮件发送失败');
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const subject = '欢迎使用智能题库系统';
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #3b82f6; text-align: center;">欢迎加入智能题库系统！</h1>
        <p>亲爱的 ${name}，</p>
        <p>感谢您注册我们的智能题库系统！我们很高兴您选择我们的平台来提升您的学习效率。</p>
        
        <h3 style="color: #333;">您可以使用以下功能：</h3>
        <ul style="color: #666;">
          <li>📚 上传和管理您的题库</li>
          <li>🤖 AI智能解析题目内容</li>
          <li>📝 个性化练习模式</li>
          <li>📊 详细的学习统计</li>
          <li>🏆 成就系统和进度跟踪</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
             style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            开始使用
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">如果您有任何问题，请随时联系我们的客服团队。</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          此邮件由系统自动发送，请勿回复。
        </p>
      </div>
    `;

    await this.sendEmail({
      email,
      subject,
      message: `欢迎使用智能题库系统！访问 ${process.env.FRONTEND_URL || 'http://localhost:3000'} 开始使用。`,
      html
    });
  }

  async sendPasswordResetConfirmation(email: string, name: string): Promise<void> {
    const subject = '密码重置成功';
    const html = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #10b981; text-align: center;">密码重置成功</h2>
        <p>亲爱的 ${name}，</p>
        <p>您的密码已成功重置。如果这不是您本人的操作，请立即联系我们的客服团队。</p>
        
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #0369a1;">
            <strong>安全提示：</strong>为了保护您的账户安全，建议您定期更换密码，并使用强密码。
          </p>
        </div>
        
        <p style="color: #666; font-size: 14px;">重置时间：${new Date().toLocaleString('zh-CN')}</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          如果您没有进行此操作，请立即联系客服：support@quizsystem.com
        </p>
      </div>
    `;

    await this.sendEmail({
      email,
      subject,
      message: '您的密码已成功重置。如果这不是您本人的操作，请立即联系客服。',
      html
    });
  }
}

// 导出单例实例
export const emailService = new EmailService();

// 导出便捷函数
export const sendEmail = (options: EmailOptions): Promise<void> => {
  return emailService.sendEmail(options);
};
