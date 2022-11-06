-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);
