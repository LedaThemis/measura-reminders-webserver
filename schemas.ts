import { z } from 'zod';

export const reminderCreateSchema = z.object({
  text: z.string({ required_error: 'text is required' }),
  cron: z.string({ required_error: 'cron is required' }),
  userId: z.string({ required_error: 'userId is required' }),
});

export const remindersGetSchema = z.object({
  userId: z.string({ required_error: 'userId is required' }),
});

export const reminderDeleteSchema = z.object({
  userId: z.string({ required_error: 'userId is required' }),
});
