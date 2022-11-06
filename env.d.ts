declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly DATABASE_URL: string;
      readonly SMTP_HOST: string;
      readonly SMTP_PORT: string;
      readonly SMTP_SECURE: 'true' | 'false';
      readonly EMAIL_SUBJECT: string;
      readonly NAME: string;
      readonly EMAIL: string;
      readonly PASSWORD: string;
      readonly NODE_ENV: 'development' | 'production';
      readonly PORT: string;
      readonly FRONTEND_ADDRESS: string;
      readonly REMINDERS_AUTH_KEY: string;
    }
  }
}

export {};
