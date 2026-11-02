import fs from 'fs';
import path from 'path';

export class EmailService {
  private provider: 'console' | 'sendgrid';
  private logPath: string;

  constructor() {
    this.provider = (process.env.EMAIL_PROVIDER as 'console' | 'sendgrid') || 'console';
    this.logPath = path.join(__dirname, '../../logs/notifications.log');
    
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    if (this.provider === 'console') {
      const logEntry = `[EMAIL] To: ${to} | Subject: ${subject} | Body: ${body}\n`;
      fs.appendFileSync(this.logPath, logEntry);
      console.log(logEntry);
    } else if (this.provider === 'sendgrid') {
      // Stub for SendGrid
      console.log(`Sending real email via SendGrid to ${to}`);
    }
  }
}

export const emailService = new EmailService();
