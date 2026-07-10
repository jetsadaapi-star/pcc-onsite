import { ArrowLeft, CheckCircle2, ClipboardList, LocateFixed, MapPinned, Sparkles } from "lucide-react";
import Link from "next/link";
import { ProjectForm } from "@/components/project-form";

function getSafeReturnTo(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return undefined;
  }
}

export default async function NewProjectPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const backHref = getSafeReturnTo(params.returnTo) ?? "/projects";

  return (
    <div className="content-stack new-project-page">
      <section className="new-project-hero">
        <div>
          <span className="hero-label">
            <Sparkles size={15} />
            New Site
          </span>
          <h1>เพิ่มโครงการ/หน้างานใหม่</h1>
          <p>บันทึกข้อมูลลูกค้า ที่อยู่ และพิกัด GPS จากหน้างานจริง เพื่อให้ทีมขาย วิศวกร และแอดมินติดตามงานต่อได้ทันที</p>
        </div>
        <Link className="button secondary" href={backHref}>
          <ArrowLeft size={17} />
          กลับหน้าจัดการ
        </Link>
      </section>

      <section className="new-project-layout">
        <ProjectForm backHref={backHref} redirectTo={backHref} />

        <aside className="new-project-side">
          <div className="new-project-side-card primary">
            <span><LocateFixed size={22} /></span>
            <h2>อยู่หน้างานให้กดดึง GPS</h2>
            <p>พิกัดช่วยให้เช็คอิน คำนวณระยะทาง และตรวจสอบรายงานเดินทางแม่นขึ้น</p>
          </div>

          <div className="new-project-side-card">
            <h3>ข้อมูลที่ควรครบ</h3>
            <ul>
              <li><ClipboardList size={16} /> ชื่อโครงการและชื่อลูกค้า</li>
              <li><MapPinned size={16} /> ที่อยู่หรือจุดสังเกตหน้างาน</li>
              <li><CheckCircle2 size={16} /> รายละเอียดงานหรือสิ่งที่ต้องติดตาม</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
}
