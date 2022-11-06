import { Server } from 'hyper-express';
import dotenv from 'dotenv';
import cors from 'cors';
import parser from 'cron-parser';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { reminderCreateSchema, reminderDeleteSchema, remindersGetSchema } from './schemas';
import remindersJob from './jobs/reminders';

dotenv.config();

const prisma = new PrismaClient();

const webserver = new Server();

webserver.use(
  cors({
    origin: process.env['FRONTEND_ADDRESS'],
  })
);

webserver.use((request, response, next) => {
  request.headers['authorization'] === `Bearer ${process.env.REMINDERS_AUTH_KEY}`
    ? next()
    : next(new Error('UNAUTHORIZED'));
});

webserver.get('/', (request, response) => {
  response.send('OK');
});

// GET reminders
webserver.get('/reminders', async (request, response) => {
  const data = remindersGetSchema.safeParse(request.query_parameters);

  if (!data.success) {
    const error = fromZodError(data.error);

    return response.json({
      state: 'failed',
      error: error.message,
    });
  }

  const reminders = await prisma.reminder.findMany({
    where: {
      userId: data.data.userId,
    },
  });

  return response.json({
    state: 'success',
    reminders,
  });
});

// CREATE reminder
webserver.post('/reminders', async (request, response) => {
  const body: z.infer<typeof reminderCreateSchema> = await request.urlencoded();

  const data = reminderCreateSchema.safeParse(body);

  if (!data.success) {
    const error = fromZodError(data.error);

    return response.json({
      state: 'failed',
      error: error.message,
    });
  }

  if (!cron.validate(body.cron)) {
    return response.json({
      state: 'failed',
      error: 'Invalid cron',
    });
  }

  const interval = parser.parseExpression(body.cron);

  await prisma.reminder.create({
    data: {
      text: body.text,
      userId: body.userId,
      cron: body.cron,
      dueDate: interval.next().toDate(),
    },
  });

  return response.json({
    state: 'success',
  });
});

// DELETE reminder
webserver.delete('/reminders/:reminderId', async (request, response) => {
  const body: z.infer<typeof reminderDeleteSchema> = await request.urlencoded();

  const data = reminderDeleteSchema.safeParse(body);

  if (!data.success) {
    const error = fromZodError(data.error);

    return response.json({
      state: 'failed',
      error: error.message,
    });
  }

  await prisma.reminder.deleteMany({
    where: {
      id: request.params.reminderId,
      userId: body.userId,
    },
  });

  return response.json({
    state: 'success',
  });
});

const port = parseInt(process.env['PORT']);

// Activate webserver by calling .listen(port, callback);
webserver
  .listen(port)
  .then((socket) => console.log(`INFO | Webserver started on port ${port}`))
  .catch((error) => console.log(`ERROR | Failed to start webserver on port ${port}\nError: ${error}`));

process.on('SIGINT', () => {
  console.log('Exiting...');

  process.exit();
});

// Jobs
remindersJob();
