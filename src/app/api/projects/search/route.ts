import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return Response.json({ error: "คำค้นหาต้องมีความยาว 2-100 ตัวอักษร" }, { status: 400 });
  }

  const projects = await prisma.project.findMany({
    where: {
      status: { notIn: ["COMPLETED", "CLOSED_LOST", "CANCELLED"] },
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { customerName: { contains: query, mode: "insensitive" } }
      ]
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, code: true, name: true, customerName: true }
  });

  return Response.json({ projects }, { headers: { "Cache-Control": "private, max-age=30" } });
}
