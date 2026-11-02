import prisma from '../lib/prisma';
import { emailService } from '../services/email.service';
import { smsService } from '../services/sms.service';

interface NotifyOptions {
  channel: 'email' | 'sms' | 'both';
  to: string; // Email or phone
  subject?: string;
  body: string;
  userId?: string; // Optional: If provided, saves an in-app Notification to the DB
}

export async function notify(options: NotifyOptions) {
  try {
    if (options.channel === 'email' || options.channel === 'both') {
      await emailService.sendEmail(options.to, options.subject || 'Notification', options.body);
    }
    if (options.channel === 'sms' || options.channel === 'both') {
      await smsService.sendSms(options.to, options.body);
    }

    if (options.userId) {
      await prisma.notification.create({
        data: {
          userId: options.userId,
          message: options.subject ? `${options.subject} - ${options.body}` : options.body,
        }
      });
    }
  } catch (error) {
    console.error('Failed to send notification', error);
  }
}
