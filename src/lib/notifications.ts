import "server-only";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

type ReminderResult = {
  scanned: number;
  sent: number;
  failed: number;
  skipped: number;
};

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function createTransporter() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD ?? ""
        }
      : undefined
  });
}

async function sendEmail(to: string, subject: string, message: string) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: message
  });
}

async function sendLinePush(lineUserId: string, message: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not configured");

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: message }]
    })
  });

  if (!response.ok) {
    throw new Error(`LINE push failed: ${response.status} ${await response.text()}`);
  }
}

async function logNotification(input: {
  userId: string;
  checkInId: string;
  channel: "EMAIL" | "LINE";
  status: "SENT" | "FAILED" | "SKIPPED";
  destination?: string | null;
  message: string;
  error?: string;
}) {
  await prisma.notificationLog.upsert({
    where: {
      checkInId_type_channel: {
        checkInId: input.checkInId,
        type: "CHECKOUT_REMINDER",
        channel: input.channel
      }
    },
    create: {
      ...input,
      type: "CHECKOUT_REMINDER",
      sentAt: input.status === "SENT" ? new Date() : undefined
    },
    update: {
      userId: input.userId,
      status: input.status,
      destination: input.destination,
      message: input.message,
      error: input.error,
      sentAt: input.status === "SENT" ? new Date() : null
    }
  });
}

export async function processCheckoutReminders(): Promise<ReminderResult> {
  const setting = await prisma.systemSetting.findFirst({
    orderBy: { updatedAt: "desc" },
    select: {
      checkoutReminderEnabled: true,
      checkoutReminderAfterMinutes: true,
      checkoutReminderEmailEnabled: true,
      checkoutReminderLineEnabled: true
    }
  });

  if (setting && !setting.checkoutReminderEnabled) {
    return { scanned: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const afterMinutes = setting?.checkoutReminderAfterMinutes ?? 480;
  const cutoff = new Date(Date.now() - afterMinutes * 60 * 1000);
  const openVisits = await prisma.checkIn.findMany({
    where: {
      checkedOutAt: null,
      checkedAt: { lte: cutoff },
      user: { checkoutReminderEnabled: true, active: true },
    },
    include: {
      user: { select: { id: true, name: true, email: true, lineUserId: true } },
      project: { select: { code: true, name: true, customerName: true } },
      notificationLogs: {
        where: { type: "CHECKOUT_REMINDER" },
        select: { channel: true, status: true }
      }
    },
    take: 100
  });

  const result: ReminderResult = { scanned: openVisits.length, sent: 0, failed: 0, skipped: 0 };

  for (const visit of openVisits) {
    const alreadySent = (channel: "EMAIL" | "LINE") =>
      visit.notificationLogs.some((log) => log.channel === channel && log.status === "SENT");
    const subject = `PCC OnSite: reminder to check out from ${visit.project.code}`;
    const message = [
      `PCC OnSite reminder`,
      `${visit.user.name} has an open check-in.`,
      `Project: ${visit.project.code} ${visit.project.name}`,
      `Customer: ${visit.project.customerName}`,
      `Checked in: ${formatDateTime(visit.checkedAt)}`,
      `Please open PCC OnSite and check out when work is complete.`
    ].join("\n");

    if (setting?.checkoutReminderEmailEnabled && !alreadySent("EMAIL")) {
      if (!hasSmtpConfig()) {
        await logNotification({
          userId: visit.userId,
          checkInId: visit.id,
          channel: "EMAIL",
          status: "SKIPPED",
          destination: visit.user.email,
          message,
          error: "SMTP is not configured"
        });
        result.skipped += 1;
      } else {
        try {
          await sendEmail(visit.user.email, subject, message);
          await logNotification({
            userId: visit.userId,
            checkInId: visit.id,
            channel: "EMAIL",
            status: "SENT",
            destination: visit.user.email,
            message
          });
          result.sent += 1;
        } catch (error) {
          await logNotification({
            userId: visit.userId,
            checkInId: visit.id,
            channel: "EMAIL",
            status: "FAILED",
            destination: visit.user.email,
            message,
            error: error instanceof Error ? error.message : String(error)
          });
          result.failed += 1;
        }
      }
    }

    if (setting?.checkoutReminderLineEnabled && !alreadySent("LINE")) {
      if (!visit.user.lineUserId) {
        await logNotification({
          userId: visit.userId,
          checkInId: visit.id,
          channel: "LINE",
          status: "SKIPPED",
          destination: null,
          message,
          error: "User has no LINE user id"
        });
        result.skipped += 1;
      } else {
        try {
          await sendLinePush(visit.user.lineUserId, message);
          await logNotification({
            userId: visit.userId,
            checkInId: visit.id,
            channel: "LINE",
            status: "SENT",
            destination: visit.user.lineUserId,
            message
          });
          result.sent += 1;
        } catch (error) {
          await logNotification({
            userId: visit.userId,
            checkInId: visit.id,
            channel: "LINE",
            status: "FAILED",
            destination: visit.user.lineUserId,
            message,
            error: error instanceof Error ? error.message : String(error)
          });
          result.failed += 1;
        }
      }
    }
  }

  return result;
}
