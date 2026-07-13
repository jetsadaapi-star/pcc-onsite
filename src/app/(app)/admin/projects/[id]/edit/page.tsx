import { notFound } from "next/navigation";
import { AdminProjectEditForm } from "@/components/admin-project-edit-form";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  return (
    <div className="new-project-page">
      <section className="new-project-hero">
        <div><span>ADMIN PROJECT</span><h1>แก้ไขโครงการ</h1><p>{project.code} · {project.name}</p></div>
      </section>
      <AdminProjectEditForm project={project} />
    </div>
  );
}
