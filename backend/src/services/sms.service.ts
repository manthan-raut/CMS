import fs from 'fs';
import path from 'path';

export class SmsService {
  private provider: 'console' | 'msg91';
  private logPath: string;

  constructor() {
    this.provider = (process.env.SMS_PROVIDER as 'console' | 'msg91') || 'console';
    this.logPath = path.join(__dirname, '../../logs/notifications.log');
    
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  async sendSms(to: string, message: string): Promise<void> {
    if (this.provider === 'console') {
      const logEntry = `[SMS] To: ${to} | Message: ${message}\n`;
      fs.appendFileSync(this.logPath, logEntry);
      console.log(logEntry);
    } else if (this.provider === 'msg91') {
      // Stub for MSG91
      console.log(`Sending real SMS via MSG91 to ${to}`);
    }
  }
}

export const smsService = new SmsService();
