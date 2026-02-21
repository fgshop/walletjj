import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = (this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com') || '').trim();
    const port = Number((this.configService.get<string>('SMTP_PORT', '587') || '').toString().trim());
    const user = (this.configService.get<string>('SMTP_USER') || '').trim();
    const pass = (this.configService.get<string>('SMTP_PASS') || '').trim();

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email service configured with SMTP: ${host}:${port}`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    const subject = '[JOJUWallet] 이메일 인증 코드';
    const html = `
      <div style="max-width:480px;margin:0 auto;font-family:'Apple SD Gothic Neo',sans-serif;padding:40px 20px">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:#1a1a2e;color:#fff;font-weight:bold;font-size:20px">J</div>
          <h2 style="margin:16px 0 4px;color:#1a1a2e">JOJUWallet</h2>
          <p style="color:#888;font-size:14px;margin:0">이메일 인증 코드</p>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:32px;text-align:center">
          <p style="color:#333;font-size:14px;margin:0 0 16px">아래 6자리 코드를 입력해주세요:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a1a2e;margin:16px 0">${code}</div>
          <p style="color:#999;font-size:12px;margin:16px 0 0">이 코드는 10분간 유효합니다.</p>
        </div>
        <p style="color:#aaa;font-size:11px;text-align:center;margin-top:24px">
          본인이 요청하지 않은 경우 이 이메일을 무시해주세요.
        </p>
      </div>
    `;

    if (!this.transporter) {
      this.logger.log(`[NO SMTP] Verification email to ${to}, code: ${code}`);
      return;
    }

    try {
      const from = (this.configService.get<string>(
        'SMTP_FROM',
        `JOJUWallet <${(this.configService.get<string>('SMTP_USER') || '').trim()}>`,
      ) || '').trim();
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${(error as Error).message}`);
    }
  }
}
