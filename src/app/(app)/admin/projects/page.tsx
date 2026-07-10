import ProjectsPage from "../../projects/page";
import { requireAdmin } from "@/lib/auth";

export default async function AdminProjectsPage(props: {
  searchParams: Promise<{ q?: string; status?: string; owner?: string; location?: string; page?: string }>;
}) {
  await requireAdmin();
  return <ProjectsPage {...props} basePath="/admin/projects" />;
}
