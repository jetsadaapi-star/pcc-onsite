import { NextRequest } from "next/server";
import { processCheckoutReminders } from "@/lib/notifications";

async function isAllowed(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");
  return Boolean(secret && secret.length >= 32 && headerSecret === secret);
}

export async function POST(request: NextRequest) {
  if (!(await isAllowed(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processCheckoutReminders();
  return Response.json(result);
}
