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
import { getUserInfo, isAuthenticated, validateCron } from './utils';

dotenv.config();

const prisma = new PrismaClient();

const webserver = new Server();

webserver.use(
  cors({
    origin: process.env['FRONTEND_ADDRESS'],
  })
);

webserver.use((request, response, next) => {
  if (isAuthenticated(request)) {
    next();
  } else {
    next(new Error('UNAUTHORIZED'));
  }
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

  if (body.cron.split(' ').length === 6) {
    return response.json({
      state: 'failed',
      error: 'Seconds option should not be specified.',
    });
  }

  if (!validateCron(body.cron)) {
    return response.json({
      state: 'failed',
      error: 'minutes and hours should be specified.',
    });
  }

  const user = await getUserInfo(body.userId);

  if (!user) {
    return response.json({
      state: 'failed',
      error: 'User does not exist',
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

webserver.set_error_handler((request, response, error) => {
  return response.json({
    state: 'failed',
    error: error.message,
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
