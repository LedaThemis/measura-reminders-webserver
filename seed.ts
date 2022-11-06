import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.reminder.createMany({
    data: [
      {
        text: 'Reminder 1',
        cron: '0 15 * * 0,1',
        dueDate: new Date('2020-10-11T15:00:00+0300'),
        userId: 'cl9y0akxc0000sbt9x3rz5xro',
      },
    ],
  });
}

main()
  .then(() => {
    prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
