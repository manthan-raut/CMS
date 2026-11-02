import cron from 'node-cron';
import prisma from '../lib/prisma';
import { notify } from '../utils/notification';

export function initCronJobs() {
  // Rent Due Alert: Runs daily at 00:00
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running Rent Due Alert job...');
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const activeRooms = await prisma.room.findMany({
        where: { status: 'ACTIVE' }
      });

      const unpaidRooms = [];
      for (const room of activeRooms) {
        const payment = await prisma.rentPayment.findUnique({
          where: {
            roomId_paymentMonth_paymentYear: {
              roomId: room.id,
              paymentMonth: currentMonth,
              paymentYear: currentYear
            }
          }
        });
        if (!payment) {
          unpaidRooms.push(room);
        }
      }

      if (unpaidRooms.length > 0) {
        const financeManagers = await prisma.user.findMany({ where: { role: 'FINANCE_MANAGER' } });
        for (const fm of financeManagers) {
          await notify({
            channel: 'both',
            to: fm.email,
            subject: 'Daily Alert: Unpaid Rents',
            body: `There are ${unpaidRooms.length} active rooms with no rent payment recorded for ${currentMonth}/${currentYear}.`,
            userId: fm.id
          });
        }
      }
    } catch (err) {
      console.error('[CRON] Rent Due Alert Error:', err);
    }
  });

  // Agreement Expiry Alert: Runs daily at 00:00
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running Agreement Expiry Alert job...');
    try {
      const activeRooms = await prisma.room.findMany({
        where: { status: 'ACTIVE', agreementEndDate: { not: null } },
        include: { createdBy: true }
      });

      const nowTime = new Date().getTime();

      for (const room of activeRooms) {
        if (!room.agreementEndDate) continue;
        const daysLeft = Math.floor((room.agreementEndDate.getTime() - nowTime) / (1000 * 3600 * 24));
        
        if (daysLeft === 90 || daysLeft === 60 || daysLeft === 30 || daysLeft === 0) {
          const bodyMsg = `Agreement for room ${room.roomNumber} (${room.projectName}) expires in ${daysLeft} days.`;
          
          const recipients = await prisma.user.findMany({
            where: {
              OR: [
                { id: room.createdById },
                { role: 'HOD' },
                { role: 'FINANCE_MANAGER' }
              ]
            }
          });

          for (const user of recipients) {
            await notify({
              channel: 'email',
              to: user.email,
              subject: 'Agreement Expiry Alert',
              body: bodyMsg,
              userId: user.id
            });
          }
        }
      }
    } catch (err) {
      console.error('[CRON] Agreement Expiry Alert Error:', err);
    }
  });

  console.log('✅ Cron jobs initialized.');
}
