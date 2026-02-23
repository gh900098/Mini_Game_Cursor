import { Injectable, Logger } from '@nestjs/common';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly settingsService: SystemSettingsService) {}

  async sendVerificationCode(email: string, code: string) {
    const settings = await this.settingsService.getAllSettings();
    const provider = settings['EMAIL_PROVIDER'] || 'none';

    if (provider === 'none') {
      this.logger.warn(
        `No email provider configured. Verification code for ${email} is: ${code}`,
      );
      return;
    }

    const subject = 'Verify your email';
    const text = `Your verification code is: ${code}. It expires in 15 minutes.`;
    const html = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2>Email Verification</h2>
                <p>Thank you for registering. Please use the following code to verify your email address:</p>
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4F46E5; margin: 20px 0;">${code}</div>
                <p>This code expires in 15 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `;

    try {
      if (provider === 'smtp') {
        await this.sendSmtp(settings, email, subject, text, html);
      } else if (provider === 'resend') {
        await this.sendResend(settings, email, subject, text, html);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${email}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to send verification email');
    }
  }

  private async sendSmtp(
    settings: any,
    to: string,
    subject: string,
    text: string,
    html: string,
  ) {
    const transporter = nodemailer.createTransport({
      host: settings['SMTP_HOST'],
      port: parseInt(settings['SMTP_PORT'], 10),
      secure:
        settings['SMTP_SECURE'] === 'true' || settings['SMTP_PORT'] === '465',
      auth: {
        user: settings['SMTP_USER'],
        pass: settings['SMTP_PASS'],
      },
    });

    await transporter.sendMail({
      from: settings['EMAIL_FROM'] || '"Mini Game Admin" <noreply@example.com>',
      to,
      subject,
      text,
      html,
    });
    this.logger.log(`Sent SMTP email to ${to}`);
  }

  private async sendResend(
    settings: any,
    to: string,
    subject: string,
    text: string,
    html: string,
  ) {
    const resend = new Resend(settings['RESEND_API_KEY']);
    await resend.emails.send({
      from: settings['EMAIL_FROM'] || 'onboarding@resend.dev',
      to,
      subject,
      text,
      html,
    });
    this.logger.log(`Sent Resend email to ${to}`);
  }
}
