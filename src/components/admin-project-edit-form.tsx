"use client";

import { Save } from "lucide-react";
import { useTransition } from "react";
import { updateProjectAction } from "@/lib/actions";
import { projectStatusOptions } from "@/lib/project-status";

type ProjectValue = {
  id: string;
  name: string;
  customerName: string;
  contactName: string | null;
  contactPhone: string | null;
  address: string;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  description: string | null;
};

export function AdminProjectEditForm({ project }: { project: ProjectValue }) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="new-project-form"
      action={(formData) => startTransition(async () => updateProjectAction(formData))}
    >
      <input type="hidden" name="id" value={project.id} />
      <section className="new-project-form-card">
        <div className="new-project-step-head">
          <span>1</span>
          <div><h2>ข้อมูลโครงการและลูกค้า</h2><p>แก้ไขข้อมูลหลัก ผู้ติดต่อ และสถานะของโครงการ</p></div>
        </div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="project-edit-name">ชื่อโครงการ</label><input className="input" id="project-edit-name" name="name" defaultValue={project.name} required /></div>
          <div className="field"><label htmlFor="project-edit-customer">ชื่อลูกค้า</label><input className="input" id="project-edit-customer" name="customerName" defaultValue={project.customerName} required /></div>
          <div className="field"><label htmlFor="project-edit-contact">ผู้ติดต่อ</label><input className="input" id="project-edit-contact" name="contactName" defaultValue={project.contactName ?? ""} /></div>
          <div className="field"><label htmlFor="project-edit-phone">เบอร์โทร</label><input className="input" id="project-edit-phone" name="contactPhone" defaultValue={project.contactPhone ?? ""} /></div>
          <div className="field"><label htmlFor="project-edit-status">สถานะ</label><select className="select" id="project-edit-status" name="status" defaultValue={project.status}>{projectStatusOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></div>
          <div className="field"><label htmlFor="project-edit-province">จังหวัด</label><input className="input" id="project-edit-province" name="province" defaultValue={project.province ?? ""} /></div>
        </div>
      </section>
      <section className="new-project-form-card">
        <div className="new-project-step-head">
          <span>2</span>
          <div><h2>สถานที่และรายละเอียดงาน</h2><p>แก้ไขที่อยู่ พิกัด และข้อมูลที่ทีมภาคสนามต้องทราบ</p></div>
        </div>
        <div className="field"><label htmlFor="project-edit-address">ที่อยู่หน้างาน</label><textarea className="textarea" id="project-edit-address" name="address" defaultValue={project.address} required /></div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="project-edit-latitude">Latitude</label><input className="input" id="project-edit-latitude" name="latitude" type="number" step="any" defaultValue={project.latitude ?? ""} /></div>
          <div className="field"><label htmlFor="project-edit-longitude">Longitude</label><input className="input" id="project-edit-longitude" name="longitude" type="number" step="any" defaultValue={project.longitude ?? ""} /></div>
        </div>
        <div className="field"><label htmlFor="project-edit-description">รายละเอียดเพิ่มเติม</label><textarea className="textarea" id="project-edit-description" name="description" defaultValue={project.description ?? ""} /></div>
      </section>
      <div className="new-project-actions">
        <a className="button secondary" href={`/projects/${project.id}`}>ยกเลิก</a>
        <button className="button" type="submit" disabled={isPending}><Save size={17} />{isPending ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button>
      </div>
    </form>
  );
}
