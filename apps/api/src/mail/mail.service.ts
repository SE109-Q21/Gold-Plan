import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    const smtpHost = this.config.get<string>('SMTP_HOST');
    this.from = this.config.get<string>('SMTP_FROM', 'noreply@gpls.vn');
    this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');

    if (!smtpHost) {
      this.logger.warn(
        'MailService: SMTP_HOST not configured — email sending disabled (dev mode)',
      );
      this.transporter = null;
    } else {
      const smtpPort = Number(this.config.get('SMTP_PORT', '587'));
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/auth/verify-email?token=${token}`;
    const subject = 'Verify your GPLS account';
    const html = this.buildVerificationHtml(link);
    await this.send(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const link = `${this.appUrl}/auth/reset-password?token=${token}`;
    const subject = 'Reset your GPLS password';
    const html = this.buildPasswordResetHtml(link);
    await this.send(to, subject, html);
  }

  async sendAlertEmail(
    to: string,
    data: {
      brand: string;
      goldType: string;
      condition: string;
      thresholdPrice: bigint;
      currentPrice: bigint;
      chartSvg?: string;
    },
  ): Promise<void> {
    const condLabel = data.condition === 'gte' ? '≥' : data.condition === 'smart' ? '↑↓' : '≤';
    const fmt = (n: bigint) => Number(n).toLocaleString('vi-VN') + ' ₫';
    const subject = `GPLS Alert: ${data.brand} ${data.goldType}`;
    const html = `<p>Your alert was triggered!</p>
  <p><strong>${data.brand} ${data.goldType}</strong> buy price is now <strong>${fmt(data.currentPrice)}</strong></p>
  ${data.chartSvg ? `<div style="margin:16px 0">${data.chartSvg}</div><p style="font-size:11px;color:#888">24-hour price chart</p>` : ''}
  <hr/><p style="font-size:11px;color:#888">For reference only — not financial advice.</p>`;
    await this.send(to, subject, html);
  }

  async sendDigestEmail(
    to: string,
    data: {
      date: string;
      sjcBuyVnd: number;
      sjcSellVnd: number;
      xauUsd: number;
      pctChangeSjc: number;
      highlight: string;
      aiSummary?: string | null;
    },
  ): Promise<void> {
    const fmtVnd = (n: number) => n.toLocaleString('vi-VN') + ' ₫';
    const pctLabel = data.pctChangeSjc >= 0
      ? `+${data.pctChangeSjc.toFixed(2)}%`
      : `${data.pctChangeSjc.toFixed(2)}%`;
    const subject = `GPLS Morning Digest — ${data.date}`;
    const html = `
      <h2>📊 Morning Gold Digest — ${data.date}</h2>
      <table>
        <tr><td><strong>SJC Buy</strong></td><td>${fmtVnd(data.sjcBuyVnd)}</td></tr>
        <tr><td><strong>SJC Sell</strong></td><td>${fmtVnd(data.sjcSellVnd)}</td></tr>
        <tr><td><strong>XAU/USD</strong></td><td>$${data.xauUsd.toFixed(2)}</td></tr>
        <tr><td><strong>vs Yesterday</strong></td><td>${pctLabel}</td></tr>
      </table>
      <p><strong>Highlight:</strong> ${data.highlight}</p>
      ${data.aiSummary ? `<p><em>${data.aiSummary}</em></p>` : ''}
      <hr/><p style="font-size:11px;color:#888">GoldTracker · For reference only — not financial advice.</p>
    `;
    await this.send(to, subject, html);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        'MailService: SMTP not configured, skipping email send',
      );
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      const maskedEmail = to.replace(/(?<=.).(?=[^@]*@)/g, '*');
      this.logger.log(`MailService: email sent — to=${maskedEmail} subject="${subject}"`);
    } catch (err) {
      this.logger.error(
        `MailService: failed to send email to ${to}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      // Intentionally not re-throwing — email failure should not break auth flow
    }
  }

  private buildVerificationHtml(link: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0B0B0F;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0B0F;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#111116;border-radius:8px;overflow:hidden;border:1px solid #1E1E28;">
          <!-- Header -->
          <tr>
            <td style="background-color:#D4AF37;padding:20px 40px;text-align:center;">
              <span style="color:#0B0B0F;font-size:22px;font-weight:700;letter-spacing:1px;">GoldTracker</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="color:#F5F5F5;font-size:24px;margin:0 0 16px;">Verify your email address</h1>
              <p style="color:#A0A0B0;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Thanks for signing up! Click the button below to verify your email address and activate your account.
                This link is valid for <strong style="color:#D4AF37;">24 hours</strong>.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px;background-color:#D4AF37;">
                    <a href="${link}"
                       style="display:inline-block;padding:14px 32px;color:#0B0B0F;font-size:15px;
                              font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#606070;font-size:13px;margin:24px 0 0;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="color:#606070;font-size:12px;margin:12px 0 0;word-break:break-all;">
                Or copy this link: <a href="${link}" style="color:#D4AF37;">${link}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1E1E28;text-align:center;">
              <span style="color:#404050;font-size:12px;">&copy; ${new Date().getFullYear()} GoldTracker / GPLS. All rights reserved.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildPasswordResetHtml(link: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0B0B0F;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0B0F;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background-color:#111116;border-radius:8px;overflow:hidden;border:1px solid #1E1E28;">
          <!-- Header -->
          <tr>
            <td style="background-color:#D4AF37;padding:20px 40px;text-align:center;">
              <span style="color:#0B0B0F;font-size:22px;font-weight:700;letter-spacing:1px;">GoldTracker</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="color:#F5F5F5;font-size:24px;margin:0 0 16px;">Reset your password</h1>
              <p style="color:#A0A0B0;font-size:15px;line-height:1.6;margin:0 0 24px;">
                We received a request to reset the password for your GoldTracker account.
                Click the button below to choose a new password.
                This link is valid for <strong style="color:#D4AF37;">1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px;background-color:#D4AF37;">
                    <a href="${link}"
                       style="display:inline-block;padding:14px 32px;color:#0B0B0F;font-size:15px;
                              font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#606070;font-size:13px;margin:24px 0 0;">
                If you didn't request a password reset, you can safely ignore this email.
                Your password will not be changed.
              </p>
              <p style="color:#606070;font-size:12px;margin:12px 0 0;word-break:break-all;">
                Or copy this link: <a href="${link}" style="color:#D4AF37;">${link}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1E1E28;text-align:center;">
              <span style="color:#404050;font-size:12px;">&copy; ${new Date().getFullYear()} GoldTracker / GPLS. All rights reserved.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
