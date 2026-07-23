import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Fuel,
  Gauge,
  Home,
  LocateFixed,
  MapPinCheck,
  MapPinned,
  Navigation,
  ReceiptText,
  Route,
  ShieldCheck,
  Smartphone,
  UserRound,
  Wrench
} from "lucide-react";
import Link from "next/link";

const dayFlow = [
  { number: "01", label: "เปิดรอบงาน", detail: "GPS + เลขไมล์ต้นวัน", icon: Gauge, tone: "teal" },
  { number: "02", label: "เริ่มเดินทาง", detail: "เลือกต้นทางและปลายทาง", icon: Navigation, tone: "blue" },
  { number: "03", label: "ถึงหน้างาน", detail: "GPS + กิจกรรม + รูปงาน", icon: MapPinned, tone: "green" },
  { number: "04", label: "ออกจากไซต์", detail: "GPS + สรุปงาน", icon: MapPinCheck, tone: "red" },
  { number: "05", label: "ไปจุดถัดไป", detail: "ทำซ้ำโดยไม่กรอกเลขไมล์", icon: Route, tone: "violet" },
  { number: "06", label: "จบการเดินทาง", detail: "GPS + เลขไมล์ปลายวัน", icon: CheckCircle2, tone: "amber" }
] as const;

const detailedSteps = [
  {
    number: "01",
    title: "เตรียมมือถือและรถก่อนเริ่มใช้",
    summary: "ทำครั้งแรก หรือเมื่อติดตั้งบนเครื่องใหม่",
    icon: ShieldCheck,
    tone: "blue",
    points: [
      "เข้าสู่ระบบด้วยบัญชีของตนเอง และตรวจชื่อกับบทบาทที่ด้านบน",
      "อนุญาตตำแหน่งแบบแม่นยำและสิทธิ์กล้องเมื่อเบราว์เซอร์ถาม",
      "เปิดหน้า รถของฉัน ตรวจทะเบียนและสถานะอนุมัติของรถคันหลัก",
      "หากรถยังไม่พร้อมใช้งาน ให้เพิ่มรถแล้วรอแอดมินกำหนดอัตราสิ้นเปลือง"
    ],
    success: "หน้า Dashboard แสดงปุ่มเริ่มงาน และระบบพบรถของคุณ",
    href: "/vehicles",
    action: "ตรวจรถของฉัน"
  },
  {
    number: "02",
    title: "เปิดรอบงานภาคสนามครั้งแรกของวัน",
    summary: "เลขไมล์บันทึกตอนนี้เพียงครั้งเดียว",
    icon: Gauge,
    tone: "teal",
    points: [
      "กด เริ่มงานภาคสนาม จากหน้าแรก",
      "เลือกต้นทางจริง: บ้าน บริษัท ตำแหน่งปัจจุบัน หรือหน้างานเดิม",
      "กรอกเลขไมล์ต้นวันและถ่ายหน้าปัดให้เห็นตัวเลขครบ",
      "เลือกปลายทางแรก แล้วตรวจชื่อโครงการก่อนกดเริ่มเดินทาง"
    ],
    success: "ระบบแสดงรอบงานกำลังเปิด พร้อมรถและเลขไมล์ต้นวัน",
    href: "/check-in",
    action: "ไปหน้าเริ่มงาน"
  },
  {
    number: "03",
    title: "บันทึกเมื่อถึงหน้างาน",
    summary: "ยืนในพื้นที่จริงและรอ GPS พร้อม",
    icon: MapPinned,
    tone: "green",
    points: [
      "เมื่อถึงปลายทาง ให้เปิดหน้าเช็คอินและรอระบบดึง GPS",
      "ตรวจชื่อโครงการ หากไม่ตรงอย่าฝืนบันทึก ให้ยกเลิกทริปที่เริ่มผิด",
      "เลือกวัตถุประสงค์ เช่น สำรวจ พบลูกค้า ตรวจงาน หรือติดตั้ง",
      "เขียนผลการเข้าพบสั้น ๆ และถ่ายรูปพื้นที่หรือผลงานได้หลายรูป",
      "ไม่ต้องกรอกหรือถ่ายเลขไมล์ในขั้นตอนนี้"
    ],
    success: "Dashboard แสดงชื่อไซต์และสถานะกำลังเปิดงาน",
    href: "/check-in",
    action: "ไปหน้าเช็คอิน"
  },
  {
    number: "04",
    title: "ออกจากหน้างานให้ถูกจังหวะ",
    summary: "กดเมื่อออกจากไซต์นั้น ไม่ใช่ตอนจบวัน",
    icon: MapPinCheck,
    tone: "red",
    points: [
      "ตรวจว่ารูปและบันทึกงานครบก่อนออกจากพื้นที่",
      "กด ออกจากหน้างาน แล้วเลือกสถานะผลลัพธ์ของงาน",
      "เขียนสิ่งที่ต้องติดตาม หรือปัญหาที่ทีมควรรู้",
      "ยืนยัน GPS ตอนออก โดยไม่ต้องบันทึกเลขไมล์",
      "ถ้าจะไปอีกไซต์ ให้เริ่มช่วงเดินทางใหม่จากจุดนี้"
    ],
    success: "รายการมีเวลาเข้าและออกครบ พร้อมเริ่มปลายทางถัดไป",
    href: "/check-in",
    action: "ดูสถานะงานปัจจุบัน"
  },
  {
    number: "05",
    title: "บันทึกการเติมน้ำมัน",
    summary: "ทำทันทีหลังเติมเพื่อให้หลักฐานต่อเนื่อง",
    icon: Fuel,
    tone: "amber",
    points: [
      "เปิดเมนู เติมน้ำมัน ระบบจะเลือกรถของคุณอัตโนมัติ",
      "ถ่ายบิลให้เห็นวันที่ ปั๊ม ลิตร ราคาต่อลิตร และยอดรวม",
      "ถ่ายหน้าปัดเลขไมล์ในเวลาใกล้กับบิล",
      "ตรวจค่าจาก OCR กับภาพจริง และแก้เฉพาะตัวเลขที่อ่านผิด",
      "แนบรูปได้หลายรูปเมื่อบิลยาวหรือข้อมูลอยู่คนละด้าน"
    ],
    success: "รายการเติมน้ำมันแสดงบิล รูปเลขไมล์ และยอดครบ",
    href: "/fuel",
    action: "บันทึกเติมน้ำมัน"
  },
  {
    number: "06",
    title: "จบการเดินทางเมื่อเสร็จทุกจุด",
    summary: "เลขไมล์ปลายวันบันทึกเพียงครั้งเดียว",
    icon: CheckCircle2,
    tone: "violet",
    points: [
      "ออกจากหน้างานล่าสุด และปิดช่วงเดินทางที่ยังค้างก่อน",
      "เปิดหน้าเช็คอิน แล้วขยายหัวข้อ จบการเดินทางวันนี้",
      "ดึง GPS กรอกเลขไมล์สิ้นสุด และถ่ายรูปหน้าปัด",
      "ใส่หมายเหตุหากอ้อมทาง ใช้รถส่วนตัว หรือระยะต่างจาก GPS มาก",
      "ยืนยันจบวัน ระบบจะรวมทุกช่วงและตรวจความผิดปกติให้"
    ],
    success: "รอบงานปิดแล้ว และ Dashboard พร้อมเริ่มวันใหม่",
    href: "/check-in",
    action: "ไปหน้าจบการเดินทาง"
  }
] as const;

const roles = [
  {
    id: "field",
    title: "พนักงานภาคสนาม",
    icon: UserRound,
    tone: "teal",
    points: ["เปิดและปิดรอบงานทุกวันที่ใช้รถ", "เข้า–ออกไซต์ตามพื้นที่จริง", "ถ่ายผลงานและปัญหาที่พบ"]
  },
  {
    id: "sales",
    title: "ผู้แทนขาย",
    icon: BriefcaseBusiness,
    tone: "blue",
    points: ["เพิ่มลูกค้าหรือหน้างานใหม่ได้เอง", "เลือกกิจกรรมพบลูกค้าและติดตามงาน", "อัปเดตสถานะโครงการหลังเข้าพบ"]
  },
  {
    id: "engineer",
    title: "วิศวกร",
    icon: Wrench,
    tone: "amber",
    points: ["เพิ่มไซต์ตอนเข้าสำรวจ", "แนบรูปพื้นที่และจุดติดตั้งหลายรูป", "บันทึกผลสำรวจเพื่อให้ฝ่ายขายต่อยอด"]
  }
] as const;

const troubleshooting = [
  {
    title: "GPS ไม่ขึ้นหรือคลาดเคลื่อนมาก",
    answer: "เปิด Location ของมือถือ อนุญาตตำแหน่งแบบแม่นยำ ออกไปอยู่บริเวณเปิด แล้วกดอัปเดต GPS อีกครั้ง หากยังไม่ได้ให้ปิดและเปิดเบราว์เซอร์ใหม่"
  },
  {
    title: "เลือกปลายทางหรือเริ่มทริปผิด",
    answer: "กดยกเลิกทริปก่อนเช็คอินและระบุเหตุผล จากนั้นเริ่มช่วงเดินทางใหม่ ห้ามสร้างเช็คอินซ้ำเพื่อกลบรายการเดิม"
  },
  {
    title: "ลืมออกจากหน้างาน",
    answer: "กลับไปหน้าเช็คอินและบันทึกเวลาออกทันที พร้อมใส่หมายเหตุอธิบาย หากพิกัดห่างจากไซต์ ระบบจะส่งให้แอดมินตรวจสอบ"
  },
  {
    title: "ลืมจบการเดินทางเมื่อวาน",
    answer: "อย่าเปิดรอบใหม่ ให้จบรอบเดิมด้วยเลขไมล์ปัจจุบันและใส่หมายเหตุวันที่ลืม ระบบจะเก็บความต่างไว้ให้แอดมินตรวจ"
  },
  {
    title: "OCR อ่านเลขไมล์หรือบิลผิด",
    answer: "ตรวจภาพต้นฉบับแล้วแก้ค่าก่อนบันทึก ถ้าภาพเบลอให้ถ่ายใหม่ โดยต้องเก็บรูปจริงไว้เป็นหลักฐานทุกครั้ง"
  }
] as const;

function PhonePreview() {
  return (
    <div className="manual-phone" aria-label="ตัวอย่างหน้าจอมือถือ PCC OnSite">
      <div className="manual-phone-bar"><span /><strong>PCC OnSite</strong><em>วิศวกร</em></div>
      <div className="manual-phone-body">
        <div className="manual-phone-status"><small>รอบงานวันนี้</small><strong>พร้อมเดินทางไปจุดถัดไป</strong><span><Check size={14} /> กำลังเปิด</span></div>
        <div className="manual-phone-action">
          <span><Navigation size={28} /></span>
          <div><strong>เริ่มช่วงการเดินทาง</strong><small>เลือกต้นทางและปลายทาง</small></div>
          <ArrowRight size={17} />
        </div>
        <div className="manual-phone-metrics">
          <div><Route size={16} /><small>GPS วันนี้</small><strong>42.8 กม.</strong></div>
          <div><Gauge size={16} /><small>เลขไมล์ต้นวัน</small><strong>45,210.5</strong></div>
        </div>
        <div className="manual-phone-timeline">
          <strong>ลำดับวันนี้</strong>
          <div><i className="done" /><span><b>บริษัท → โครงการ A</b><small>ถึงหน้างานแล้ว</small></span></div>
          <div><i className="active" /><span><b>โครงการ A</b><small>กำลังเปิดงาน</small></span></div>
          <div><i /><span><b>จุดถัดไป</b><small>รอเริ่มเดินทาง</small></span></div>
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="manual-page">
      <section className="manual-hero">
        <div className="manual-hero-copy">
          <span className="manual-kicker"><Smartphone size={15} /> คู่มือสำหรับผู้ใช้งานภาคสนาม</span>
          <h1>ออกหน้างานให้ครบทุกขั้น<br />โดยไม่ต้องจำเอง</h1>
          <p>ตั้งแต่เปิดรอบงาน เลือกปลายทาง เช็คอิน เติมน้ำมัน จนถึงปิดเลขไมล์ปลายวัน ออกแบบให้ทำตามได้จากมือถือทีละขั้น</p>
          <div className="manual-hero-actions">
            <Link className="button success" href="/dashboard"><Navigation size={17} /> เริ่มใช้งานจริง</Link>
            <a className="button secondary" href="#daily-flow"><Route size={17} /> ดู Flow ทั้งวัน</a>
          </div>
          <div className="manual-key-rule">
            <Gauge size={21} />
            <div><strong>เลขไมล์ปกติวันละ 2 ครั้ง</strong><span>ต้นวัน 1 ครั้ง · ปลายวัน 1 ครั้ง · เช็คอินแต่ละไซต์ใช้ GPS</span></div>
          </div>
        </div>
        <PhonePreview />
      </section>

      <nav className="manual-nav" aria-label="หัวข้อคู่มือ">
        <a href="#daily-flow"><Route size={15} /> Flow ทั้งวัน</a>
        <a href="#steps"><CheckCircle2 size={15} /> วิธีใช้งาน</a>
        <a href="#roles"><UserRound size={15} /> ตามบทบาท</a>
        <a href="#help"><CircleHelp size={15} /> แก้ปัญหา</a>
      </nav>

      <section className="manual-section" id="daily-flow">
        <div className="manual-section-heading">
          <span>ภาพรวม 1 วัน</span>
          <h2>ทำตามลำดับนี้ ข้อมูลระยะทางจะไม่ปนกัน</h2>
          <p>ถ้าไปหลายไซต์ ให้วนขั้นที่ 2–5 แล้วจบการเดินทางเพียงครั้งเดียวเมื่อเสร็จทั้งวัน</p>
        </div>
        <div className="manual-flow-grid">
          {dayFlow.map((step) => {
            const Icon = step.icon;
            return (
              <article className={`manual-flow-step tone-${step.tone}`} key={step.number}>
                <div><span>{step.number}</span><Icon size={20} /></div>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </article>
            );
          })}
        </div>
        <div className="manual-journey-line">
          <Home size={17} /><span>บ้าน</span><i /><Building2 size={17} /><span>บริษัท</span><i /><MapPinned size={17} /><span>ไซต์ A</span><i /><MapPinned size={17} /><span>ไซต์ B</span>
        </div>
      </section>

      <section className="manual-section manual-steps-section" id="steps">
        <div className="manual-section-heading inline">
          <div><span>ขั้นตอนละเอียด</span><h2>เปิดอ่านเฉพาะขั้นที่กำลังทำ</h2><p>ทุกขั้นมีจุดตรวจว่าสำเร็จและลิงก์ไปหน้าที่เกี่ยวข้อง</p></div>
          <Link href="/check-in" className="manual-heading-link">เปิดหน้าเช็คอิน <ArrowRight size={15} /></Link>
        </div>
        <div className="manual-step-list">
          {detailedSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <details className={`manual-step tone-${step.tone}`} key={step.number} open={index === 0}>
                <summary>
                  <span className="manual-step-number">{step.number}</span>
                  <span className="manual-step-icon"><Icon size={20} /></span>
                  <span className="manual-step-title"><strong>{step.title}</strong><small>{step.summary}</small></span>
                  <ChevronDown className="manual-step-chevron" size={19} />
                </summary>
                <div className="manual-step-content">
                  <ol>{step.points.map((point) => <li key={point}>{point}</li>)}</ol>
                  <div className="manual-success"><CheckCircle2 size={17} /><span><strong>ตรวจว่าสำเร็จ</strong>{step.success}</span></div>
                  <Link href={step.href}>{step.action} <ArrowRight size={15} /></Link>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section className="manual-section" id="roles">
        <div className="manual-section-heading"><span>เลือกตามบทบาท</span><h2>แต่ละคนเน้นบันทึกไม่เหมือนกัน</h2><p>ทุกบทบาทใช้ Flow การเดินทางเดียวกัน แต่รายละเอียดงานควรตรงกับหน้าที่จริง</p></div>
        <div className="manual-role-grid">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <article className={`manual-role tone-${role.tone}`} id={role.id} key={role.id}>
                <span><Icon size={22} /></span><h3>{role.title}</h3>
                <ul>{role.points.map((point) => <li key={point}><Check size={14} /> {point}</li>)}</ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="manual-evidence-band">
        <div><Camera size={24} /><span><strong>รูปหน้างาน</strong><small>ภาพกว้าง + รายละเอียดงาน</small></span></div>
        <div><ReceiptText size={24} /><span><strong>บิลน้ำมัน</strong><small>วันที่ ลิตร ราคา และยอดรวม</small></span></div>
        <div><Gauge size={24} /><span><strong>รูปเลขไมล์</strong><small>ไม่เบลอ ไม่สะท้อน เห็นครบทุกหลัก</small></span></div>
        <div><LocateFixed size={24} /><span><strong>พิกัด GPS</strong><small>กดในพื้นที่จริงและรอความแม่นยำ</small></span></div>
      </section>

      <section className="manual-section manual-help" id="help">
        <div className="manual-section-heading"><span>เมื่อใช้งานติดขัด</span><h2>แก้ปัญหาที่พบบ่อย</h2><p>อย่าสร้างรายการใหม่เพื่อกลบข้อมูลผิด เพราะจะทำให้รายงานตรวจย้อนหลังยากขึ้น</p></div>
        <div className="manual-help-grid">
          {troubleshooting.map((item) => (
            <details key={item.title}>
              <summary><CircleHelp size={18} /><strong>{item.title}</strong><ChevronDown size={17} /></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
        <div className="manual-warning"><AlertTriangle size={20} /><div><strong>รายการผิดและแก้เองไม่ได้</strong><span>เก็บภาพหน้าจอ รหัสโครงการ เวลาเกิดเหตุ และแจ้งแอดมิน ห้ามลบหรือบันทึกข้อมูลสมมติเพื่อให้ผ่าน</span></div></div>
      </section>

      <section className="manual-finish">
        <div><span><Clock3 size={19} /></span><h2>พร้อมเริ่มงานภาคสนามแล้ว</h2><p>ระบบจะนำคุณไปยังขั้นตอนที่ถูกต้องตามสถานะงานปัจจุบันโดยอัตโนมัติ</p></div>
        <div><Link className="button success" href="/dashboard">กลับหน้าแรก <ArrowRight size={16} /></Link><Link className="button secondary" href="/reports">ดูรายงานของฉัน</Link></div>
      </section>
    </div>
  );
}
