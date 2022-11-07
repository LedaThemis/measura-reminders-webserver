import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

export const transporterConfig = {
  host: process.env['SMTP_HOST'],
  port: parseInt(process.env['SMTP_PORT']),
  secure: Boolean(process.env['SMTP_SECURE']),
  auth: {
    user: process.env['EMAIL'],
    pass: process.env['PASSWORD'],
  },
};

/**
 * Construct message to use in sendMail
 * @note This depends on environment variables: `NAME`, `EMAIL`, `EMAIL_SUBJECT`
 * @param recipientEmail Email of recipient
 * @param messageContent Content of message
 * @returns message
 *
 */
export const constructMessage = (recipientEmail: string, messageContent: string) => ({
  from: `${process.env['NAME']} <${process.env['EMAIL']}>`,
  to: recipientEmail,
  subject: `${process.env['EMAIL_SUBJECT']}`,
  text: messageContent,
});

type GetUserInfoResponse = {
  user: { id: string; name: string | null; email: string } | null;
};

/**
 * Calls api to get user info
 * @param userId id of user
 */
export const getUserInfo = async (userId: string) => {
  const response = await axios.get<GetUserInfoResponse>(
    `${process.env.FRONTEND_ADDRESS}/api/users/${userId}?auth=${process.env.REMINDERS_AUTH_KEY}`
  );

  return response.data.user;
};

/**
 * Returns whether provided dates are in same day
 * @param d1 first date
 * @param d2 second date
 * @returns boolean
 */
export const sameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d1.getDate();
