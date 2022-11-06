import { PrismaClient } from '@prisma/client';
import { constructMessage, getUserInfo, transporterConfig } from '../utils';
import cron from 'node-cron';
import parser from 'cron-parser';
import { createTransport } from 'nodemailer';

const prisma = new PrismaClient();

export default async function remindersJob() {
  const transporter = createTransport(transporterConfig);

  transporter.verify(function (error, success) {
    if (error) {
      console.log('ERROR | Failed to initiate transporter:');
      console.log(error);
      process.exit(1);
    } else {
      console.log('INFO | SMTP server connected.');

      main()
        .then(async () => {
          await prisma.$disconnect();
          transporter.close();
        })
        .catch(async (e) => {
          console.error(e);
          await prisma.$disconnect();
          transporter.close();
          process.exit(1);
        });
    }
  });

  async function main() {
    // Cron job to check for due reminders
    cron.schedule('* * * * *', async () => {
      const currentDate = new Date();

      const reminders = await prisma.reminder.findMany({
        where: {
          dueDate: {
            lt: currentDate,
          },
        },
      });

      const formatter = new Intl.DateTimeFormat('en', {
        minute: '2-digit',
        hour: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
      const formattedNow = formatter.format(currentDate);

      console.log('INFO |', formattedNow);

      for (let i = 0; i < reminders.length; i++) {
        const reminder = reminders[i];
        const interval = parser.parseExpression(reminder.cron);
        const nextDueDate = interval.next().toDate();

        // Update to next due date in database
        await prisma.reminder.update({
          where: {
            id: reminder.id,
          },
          data: {
            dueDate: nextDueDate,
          },
        });

        const user = await getUserInfo(reminder.userId);

        if (!user) {
          console.error(`User ${reminder.userId} does not exist!`);
          return;
        }

        const userText = user.name ? `Hey ${user.name}!` : 'Hey there!';
        const messageContent = `${userText}!\n\nReminder:\n${reminder.text}`;

        const message = constructMessage(user.email, messageContent);

        // Send mail
        transporter.sendMail(message, (error, info) => {
          if (error) {
            console.log(`ERROR | Failed to send email: ${error.message}`);
          } else {
            const sentTo = info.accepted.map((v) => (typeof v === 'string' ? v : v.address));

            console.log(`INFO | Sent ${info.messageId} to: ${new Intl.ListFormat().format(sentTo)}`);
          }
        });
      }
    });
  }
}
