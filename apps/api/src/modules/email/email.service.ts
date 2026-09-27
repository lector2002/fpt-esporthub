import { Injectable, Logger } from "@nestjs/common";

const RESEND_URL = "https://api.resend.com/emails";

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /** Sends the reset link. Never throws and never logs the link outside development. */
  async sendPasswordReset(to: string, link: string) {
    const message = buildResetMessage(to, link);
    if (this.isConfigured()) {
      await this.send(message);
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      this.logger.log(`Email not configured. Password reset link for ${to}: ${link}`);
      return;
    }
    this.logger.error("Email not configured (RESEND_API_KEY, EMAIL_FROM). Password reset email was not sent.");
  }

  private isConfigured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }

  private async send(message: EmailMessage) {
    try {
      const response = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, ...message }),
      });
      if (!response.ok) {
        this.logger.error(`Resend rejected the email (status ${response.status}).`);
      }
    } catch {
      this.logger.error("Could not reach Resend.");
    }
  }
}

function buildResetMessage(to: string, link: string): EmailMessage {
  const subject = "Đặt lại mật khẩu FPT EsportHub";
  const text = [
    "Xin chào,",
    "",
    "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản FPT EsportHub của bạn.",
    "Mở liên kết sau để đặt mật khẩu mới (hiệu lực 30 phút):",
    link,
    "",
    "Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.",
  ].join("\n");
  const html = `<p>Xin chào,</p>
<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản FPT EsportHub của bạn.</p>
<p><a href="${link}">Đặt mật khẩu mới</a> (liên kết có hiệu lực 30 phút)</p>
<p>Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.</p>`;
  return { to, subject, text, html };
}
