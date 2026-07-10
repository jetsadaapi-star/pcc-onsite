export const roleLabels: Record<string, string> = {
  ADMIN: "แอดมิน",
  EMPLOYEE: "พนักงาน",
  SALES: "ผู้แทนขาย",
  ENGINEER: "วิศวกร"
};

export const purposeLabels: Record<string, string> = {
  SITE_SURVEY: "สำรวจหน้างาน",
  CUSTOMER_VISIT: "พบลูกค้า",
  FOLLOW_UP: "ติดตามงาน",
  INSPECTION: "ตรวจงาน",
  HANDOVER: "ส่งมอบ",
  CONSTRUCTION: "ก่อสร้าง/ติดตั้ง",
  OTHER: "อื่นๆ"
};

export const claimStatusLabels: Record<string, string> = {
  DRAFT: "ฉบับร่าง",
  PENDING_REVIEW: "รอตรวจ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  PAID: "จ่ายแล้ว"
};

export const checkoutStatusLabels: Record<string, string> = {
  DONE: "เสร็จงาน",
  NEED_RETURN: "ต้องกลับมาอีก",
  WAITING_CUSTOMER: "รอลูกค้า",
  ISSUE: "มีปัญหา",
  OTHER: "อื่นๆ"
};

export function claimTone(status: string) {
  if (status === "APPROVED" || status === "PAID") return "success";
  if (status === "REJECTED") return "muted";
  return "warning";
}
