import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inviteHtml(orgName: string, link: string): string {
  const safeOrgName = escapeHtml(orgName);
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 16px;">CASDEX</h1>
      <p style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 8px;">
        You have been invited to join <strong>${safeOrgName}</strong> on CASDEX.
      </p>
      <p style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
        Click the button below to set your password and get started.
      </p>
      <a href="${link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 6px;">
        Set Your Password
      </a>
      <p style="font-size: 13px; color: #6b7280; margin-top: 32px; line-height: 1.5;">
        This link expires in 7 days. If you did not expect this invitation, you can ignore this email.
      </p>
    </div>
  `;
}

function resetHtml(link: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin-bottom: 16px;">CASDEX</h1>
      <p style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 8px;">
        A password reset was requested for your account.
      </p>
      <p style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
        Click the button below to choose a new password.
      </p>
      <a href="${link}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 24px; border-radius: 6px;">
        Reset Password
      </a>
      <p style="font-size: 13px; color: #6b7280; margin-top: 32px; line-height: 1.5;">
        This link expires in 24 hours. If you did not request a password reset, you can ignore this email.
      </p>
    </div>
  `;
}

@Injectable()
export class EmailService {
  private resend: Resend | null;
  private fromAddress: string;
  private frontendUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromAddress = process.env.EMAIL_FROM || 'CASDEX <noreply@casdex.com>';
    this.frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  }

  async sendInvite(email: string, token: string, orgName: string): Promise<void> {
    const link = `${this.frontendUrl}/set-password?token=${encodeURIComponent(token)}`;
    await this.send(email, `You've been invited to ${orgName} on CASDEX`, inviteHtml(orgName, link));
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send(email, 'Reset your CASDEX password', resetHtml(link));
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) {
      console.log(`[Email] No RESEND_API_KEY configured — would send to ${to}: ${subject}`);
      return;
    }
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
    } catch (err) {
      console.error(`[Email] Failed to send to ${to}:`, err);
    }
  }
}
