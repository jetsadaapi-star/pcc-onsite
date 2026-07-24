import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminProjectEditForm } from "@/components/admin-project-edit-form";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageProject } from "@/lib/project-access";

export default async function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project || !canManageProject(user, project)) notFound();

  return (
    <div className="new-project-page">
      <section className="new-project-hero">
        <div>
          <span className="hero-label"><Pencil size={15} /> Project details</span>
          <h1>แก้ไขข้อมูลโครงการ</h1>
          <p>{project.code} · {project.name}</p>
        </div>
        <Link className="button secondary" href={`/projects/${project.id}`}>
          <ArrowLeft size={17} />
          กลับหน้ารายละเอียด
        </Link>
      </section>
      <AdminProjectEditForm project={project} canEditStatus={user.role === "ADMIN"} />
    </div>
  );
}
