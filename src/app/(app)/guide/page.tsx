import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  CarFront,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Fuel,
  Gauge,
  MapPinned,
  Navigation,
  ReceiptText,
  Route,
  ShieldCheck,
  UserRound,
  Wrench
} from "lucide-react";
import Link from "next/link";

const quickSteps = [
  {
    title: "เริ่มเดินทาง",
    copy: "ครั้งแรกของวันให้ถ่ายเลขไมล์ต้นวัน จากนั้นเลือกจุดเริ่มจริงและปลายทาง",
    icon: Navigation,
    tone: "green"
  },
  {
    title: "เช็คอินเมื่อถึงหน้างาน",
    copy: "ดึง GPS เลือกโครงการ บันทึกวัตถุประสงค์และรูปงาน โดยไม่ต้องถ่ายเลขไมล์ซ้ำ",
    icon: MapPinned,
    tone: "blue"
  },
  {
    title: "เช็คเอาท์เมื่อออกจากจุดนั้น",
    copy: "กดเช็คเอาท์เมื่อจบงานที่ไซต์ หรือก่อนเดินทางไปไซต์ถัดไป เพื่อไม่ให้ระยะทางปนกัน",
    icon: CheckCircle2,
    tone: "red"
  },
  {
    title: "เติมน้ำมัน",
    copy: "ถ่ายบิลและหน้าปัดเลขไมล์ ระบบช่วย OCR ตัวเลข ลดการกรอกผิด",
    icon: Fuel,
    tone: "amber"
  },
  {
    title: "จบการเดินทางวันนี้",
    copy: "เมื่อเสร็จทุกจุดแล้ว ให้บันทึก GPS เลขไมล์ปลายวัน และรูปหน้าปัดอีกครั้ง",
    icon: Gauge,
    tone: "red"
  }
];

const roleCards = [
  {
    role: "พนักงานภาคสนาม",
    icon: UserRound,
    points: ["เปิดรอบงานพร้อมเลขไมล์ต้นวัน", "เข้า/ออกแต่ละไซต์ด้วย GPS", "จบรอบพร้อมเลขไมล์ปลายวัน"]
  },
  {
    role: "ผู้แทนขาย",
    icon: BriefcaseBusiness,
    points: ["เพิ่มหน้างานใหม่เมื่อพบลูกค้า", "บันทึกกิจกรรม เช่น ติดต่อ เสนอราคา เจรจา", "แนบรูปหรือพิกัดเพื่อให้ทีมต่อยอดได้"]
  },
  {
    role: "วิศวกร",
    icon: Wrench,
    points: ["เพิ่มโครงการตอนสำรวจหน้างาน", "บันทึกผลสำรวจและหลักฐานพื้นที่", "เช็คเอาท์ก่อนย้ายไปไซต์ถัดไป"]
  }
];

const doDont = [
  {
    title: "กดเช็คเอาท์ตอนไหน",
    detail: "กดเมื่อออกจากหน้างานนั้น ไม่ต้องรอจบทั้งวัน ถ้าไปหลายไซต์ในวันเดียวให้เช็คเอาท์ทีละไซต์"
  },
  {
    title: "ต้องเลือกปลายทางไหม",
    detail: "ควรเลือกปลายทางก่อนเริ่มเดินทาง เพื่อให้ระบบรู้ว่าทริปนี้กำลังไปไหนและจับคู่ระยะทางได้ถูก"
  },
  {
    title: "ออกจากบ้านไปไซต์เลยได้ไหม",
    detail: "ได้ ให้เลือกจุดเริ่มเป็นตำแหน่งปัจจุบัน ระบบจะใช้ GPS จุดเริ่มต้นจริง ไม่จำเป็นต้องผ่านบริษัท"
  },
  {
    title: "ต้องถ่ายเลขไมล์กี่ครั้ง",
    detail: "ปกติ 2 ครั้งต่อรถต่อวัน: ตอนเปิดรอบงานและตอนจบการเดินทาง ส่วนเติมน้ำมันให้ถ่ายเพิ่มเฉพาะรายการนั้น"
  }
];

const walkthroughFrames = [
  {
    step: "01",
    eyebrow: "ก่อนออกเดินทาง",
    title: "กด เริ่มเดินทาง",
    copy: "เปิดหน้าแรก แล้วแตะปุ่มสีเขียวขนาดใหญ่ ระบบจะเตรียม GPS และข้อมูลรถของคุณให้อัตโนมัติ",
    icon: Navigation,
    tone: "green"
  },
  {
    step: "02",
    eyebrow: "ระบุต้นทางและปลายทาง",
    title: "เลือกจุดที่ออกจริง",
    copy: "เลือก บ้าน บริษัท หรือพิกัดปัจจุบัน จากนั้นค้นหาโครงการปลายทางแล้วตรวจชื่อให้ถูกต้อง",
    icon: Route,
    tone: "blue"
  },
  {
    step: "03",
    eyebrow: "เมื่อถึงพื้นที่",
    title: "ดึง GPS และเช็คอิน",
    copy: "ยืนในบริเวณหน้างาน เปิดตำแหน่งแบบแม่นยำ แล้วรอจนระบบแสดงว่ารับพิกัดสำเร็จ",
    icon: MapPinned,
    tone: "green"
  },
  {
    step: "04",
    eyebrow: "บันทึกงาน",
    title: "เลือกกิจกรรมและถ่ายรูป",
    copy: "ระบุว่าไปทำอะไร เขียนบันทึกสั้นๆ และถ่ายหลักฐานหลายรูปได้จากกล้องมือถือ",
    icon: Camera,
    tone: "blue"
  },
  {
    step: "05",
    eyebrow: "ก่อนออกจากไซต์",
    title: "เช็คเอาท์หน้างาน",
    copy: "ตรวจว่างานและรูปครบ แล้วกดเช็คเอาท์ก่อนเดินทางไปจุดถัดไป เพื่อแยกเวลาและระยะทางให้ถูกต้อง",
    icon: CheckCircle2,
    tone: "red"
  },
  {
    step: "06",
    eyebrow: "เมื่อเติมน้ำมัน",
    title: "ถ่ายบิลและเลขไมล์",
    copy: "ถ่ายภาพให้ชัด ตรวจตัวเลขที่ OCR อ่านได้ และแก้เฉพาะเมื่อไม่ตรงกับบิลหรือหน้าปัดจริง",
    icon: Fuel,
    tone: "amber"
  },
  {
    step: "07",
    eyebrow: "เมื่อเสร็จทุกจุด",
    title: "จบการเดินทางวันนี้",
    copy: "ดึง GPS กรอกเลขไมล์ปลายวัน และถ่ายหน้าปัด ระบบจะเทียบกับระยะ GPS รวมทุกช่วง",
    icon: Gauge,
    tone: "red"
  }
];

const detailedSteps = [
  {
    number: "01",
    title: "เตรียมมือถือก่อนเริ่มงาน",
    summary: "ทำครั้งแรกหรือเมื่อเปลี่ยนเครื่อง",
    icon: ShieldCheck,
    tone: "blue",
    actions: [
      "เข้าสู่ระบบด้วยบัญชีของตนเอง และตรวจชื่อกับบทบาทที่แถบบน",
      "อนุญาตให้เบราว์เซอร์ใช้ตำแหน่ง และเลือกตำแหน่งแบบแม่นยำ",
      "เปิดกล้องเมื่อระบบขอสิทธิ์ เพื่อถ่ายรูปหน้างาน บิล และหน้าปัดเลขไมล์",
      "ตรวจหน้า รถของฉัน ว่าทะเบียนและรถคันหลักถูกต้อง หากไม่ถูกให้แจ้งผู้ดูแล"
    ],
    result: "พร้อมใช้เมื่อ GPS และกล้องได้รับอนุญาต และระบบแสดงรถของคุณถูกคัน"
  },
  {
    number: "02",
    title: "เริ่มเดินทางจากจุดที่ออกจริง",
    summary: "ครั้งแรกเปิดรอบงาน ครั้งถัดไปเลือกปลายทางได้เลย",
    icon: Navigation,
    tone: "green",
    actions: [
      "กด เริ่มเดินทาง จากหน้าแรกหรือหน้าเช็คอิน",
      "เลือกต้นทาง: บ้าน บริษัท หน้างานเดิม หรือใช้พิกัดปัจจุบันตามสถานการณ์จริง",
      "หากเป็นการเดินทางครั้งแรกของวัน ให้กรอกและถ่ายเลขไมล์ต้นวัน ระบบจะไม่ถามซ้ำในไซต์ถัดไป",
      "ค้นหาและเลือกโครงการหรือหน้างานปลายทาง หากยังไม่มีให้กดเพิ่มหน้างานใหม่",
      "ตรวจชื่อปลายทางและพิกัดบนหน้าสรุป แล้วกดยืนยันเริ่มเดินทาง"
    ],
    result: "หน้าจอจะแสดงทริปที่กำลังเดินทาง เวลาเริ่ม และปลายทางที่เลือก"
  },
  {
    number: "03",
    title: "เช็คอินเมื่อถึงหน้างาน",
    summary: "กดเมื่ออยู่ในพื้นที่จริง ไม่ควรกดระหว่างทาง",
    icon: MapPinned,
    tone: "green",
    actions: [
      "จอดรถหรือยืนในจุดที่รับสัญญาณ GPS ได้ชัด",
      "กด ดึงตำแหน่งปัจจุบัน และรอข้อความยืนยันว่ารับพิกัดสำเร็จ",
      "ตรวจโครงการที่ระบบเลือก ถ้าไม่ตรงให้ค้นหาและเปลี่ยนก่อนบันทึก",
      "เลือกวัตถุประสงค์ เช่น พบลูกค้า สำรวจ ตรวจงาน ส่งมอบ หรือกิจกรรมอื่น",
      "ใส่บันทึกที่ช่วยให้ทีมเข้าใจว่าเข้าพบใคร ทำอะไร และมีผลอย่างไร"
    ],
    result: "ระบบแสดงสถานะกำลังทำงานที่ไซต์ พร้อมเวลาเช็คอินและชื่อโครงการ"
  },
  {
    number: "04",
    title: "แนบหลักฐานให้ตรวจสอบง่าย",
    summary: "รูปที่ดีช่วยลดการโทรถามและการตีกลับรายการ",
    icon: Camera,
    tone: "blue",
    actions: [
      "กดปุ่มกล้องเพื่อถ่ายรูปใหม่ได้ทันที และเพิ่มได้หลายรูป",
      "ถ่ายภาพกว้างให้เห็นสถานที่ แล้วถ่ายรายละเอียดงานหรือจุดติดตั้งเพิ่มเติม",
      "ตรวจภาพตัวอย่างก่อนส่ง ลบรูปเบลอหรือรูปที่เลือกผิด"
    ],
    result: "รายการเช็คอินมีรูปสถานที่และหลักฐานที่เปิดดูย้อนหลังได้"
  },
  {
    number: "05",
    title: "เช็คเอาท์เมื่อออกจากไซต์",
    summary: "หนึ่งไซต์ควรมีหนึ่งรอบเช็คอินและเช็คเอาท์",
    icon: CheckCircle2,
    tone: "red",
    actions: [
      "ตรวจว่าบันทึกกิจกรรมและรูปหลักฐานครบก่อนออกจากพื้นที่",
      "กด ออกจากหน้างาน และยืนยันในหน้าต่างแจ้งเตือน โดยไม่ต้องกรอกเลขไมล์",
      "หากไปไซต์ถัดไป ให้เริ่มเดินทางใหม่โดยใช้ไซต์ปัจจุบันเป็นต้นทาง",
      "หากเริ่มทริปผิด ให้ใช้ยกเลิกทริปและระบุเหตุผล ไม่ควรปล่อยทริปค้าง"
    ],
    result: "ระบบปิดเวลาทำงานของไซต์ และพร้อมสร้างช่วงเดินทางถัดไปโดยไม่ปนกัน"
  },
  {
    number: "06",
    title: "บันทึกการเติมน้ำมัน",
    summary: "กรอกทันทีหลังเติมเพื่อให้เลขไมล์ต่อเนื่อง",
    icon: Fuel,
    tone: "amber",
    actions: [
      "เปิดเมนู เติมน้ำมัน ระบบจะเลือกรถของคุณให้อัตโนมัติ",
      "ถ่ายรูปบิลให้เห็นวันที่ ปั๊ม จำนวนลิตร ราคาต่อลิตร และยอดรวม",
      "ถ่ายรูปหน้าปัดเลขไมล์ในช่วงเวลาเดียวกัน",
      "ตรวจค่าที่ OCR อ่านได้เทียบกับภาพจริง แล้วแก้เฉพาะช่องที่อ่านผิด",
      "กดบันทึกและตรวจสถานะรายการในหน้ารายงานของฉัน"
    ],
    result: "รายการเติมน้ำมันมีบิล เลขไมล์ และข้อมูลครบสำหรับคำนวณ กม./ลิตรจริง"
  },
  {
    number: "07",
    title: "จบการเดินทางเมื่อเสร็จทั้งวัน",
    summary: "บันทึกเลขไมล์ปลายวันเพียงครั้งเดียว",
    icon: Gauge,
    tone: "red",
    actions: [
      "ตรวจว่าออกจากหน้างานและปิดช่วงเดินทางล่าสุดแล้ว",
      "เปิดหน้าเช็คอิน แล้วเลือก จบการเดินทางวันนี้",
      "ดึง GPS กรอกเลขไมล์สิ้นสุด และถ่ายรูปหน้าปัดให้ชัด",
      "ตรวจระยะจากเลขไมล์กับระยะ GPS รวม หากต่างมากให้ใส่หมายเหตุ"
    ],
    result: "รอบงานวันนี้ถูกปิด และข้อมูลพร้อมตรวจสอบโดยไม่ต้องมีเลขไมล์ทุกไซต์"
  },
  {
    number: "08",
    title: "ตรวจรายงานก่อนสิ้นเดือน",
    summary: "ช่วยแก้ข้อมูลได้ทันก่อนส่งให้ฝ่ายบัญชี",
    icon: ReceiptText,
    tone: "violet",
    actions: [
      "เปิด รายงานของฉัน แล้วเลือกช่วงวันที่ที่ต้องการตรวจ",
      "ดูทริปที่ระยะทางผิดปกติ รายการที่รอตรวจ และหลักฐานที่ยังไม่ครบ",
      "เทียบระยะ GPS กับเลขไมล์ หากต่างกันมากให้เพิ่มคำอธิบายหรือแจ้งผู้ดูแล",
      "ตรวจยอดค่าเดินทางและค่าน้ำมันก่อนรอบอนุมัติ"
    ],
    result: "ข้อมูลพร้อมให้แอดมินตรวจ อนุมัติ และส่งออกเอกสารบัญชี"
  }
];

function AnimatedWalkthrough() {
  return (
    <section className="guide-walkthrough-card">
      <div className="guide-walkthrough-copy">
        <span className="guide-kicker"><Camera size={15} /> ตัวอย่างเคลื่อนไหว</span>
        <h2>ดูภาพรวมการใช้งานใน 30 วินาที</h2>
        <p>ตัวอย่างจะเล่นวนอัตโนมัติจากเริ่มเดินทางจนถึงบันทึกน้ำมัน หยุดอ่านรายละเอียดด้านล่างได้ทุกขั้น</p>
        <div className="guide-demo-legend">
          {walkthroughFrames.map((frame) => (
            <span key={frame.step}><b>{frame.step}</b>{frame.title}</span>
          ))}
        </div>
      </div>

      <div className="guide-demo-phone" aria-label="ตัวอย่างขั้นตอนการใช้งานแบบเคลื่อนไหว">
        <div className="guide-demo-topbar">
          <span />
          <strong>PCC OnSite</strong>
          <em>คู่มือ</em>
        </div>
        <div className="guide-demo-stage">
          {walkthroughFrames.map((frame) => {
            const Icon = frame.icon;
            return (
              <div className={`guide-demo-frame tone-${frame.tone}`} key={frame.step}>
                <div className="guide-demo-count">ขั้นที่ {frame.step}</div>
                <span className="guide-demo-icon"><Icon size={34} /></span>
                <small>{frame.eyebrow}</small>
                <strong>{frame.title}</strong>
                <p>{frame.copy}</p>
                <div className="guide-demo-button">แตะเพื่อดำเนินการ <ArrowRight size={16} /></div>
              </div>
            );
          })}
        </div>
        <div className="guide-demo-progress" aria-hidden="true">
          {walkthroughFrames.map((frame) => <i key={frame.step} />)}
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  return (
    <div className="guide-phone" aria-label="ตัวอย่างหน้าจอมือถือ">
      <div className="guide-phone-top">
        <span />
        <strong>PCC OnSite</strong>
        <em>วิศวกร</em>
      </div>
      <div className="guide-phone-body">
        <div className="guide-phone-hero">
          <small>พร้อมออกหน้างานวันนี้</small>
          <strong>เริ่มจากปุ่มหลัก</strong>
        </div>
        <div className="guide-phone-main-action">
          <span><MapPinned size={30} /></span>
          <strong>เริ่มเดินทาง</strong>
          <small>เลือกต้นทาง ปลายทาง และเริ่มคำนวณระยะทาง</small>
        </div>
        <div className="guide-phone-grid">
          <div>
            <Fuel size={20} />
            <strong>เติมน้ำมัน</strong>
          </div>
          <div>
            <BriefcaseBusiness size={20} />
            <strong>เพิ่มหน้างาน</strong>
          </div>
        </div>
        <div className="guide-phone-list">
          <span><Gauge size={16} /> ระยะทางวันนี้ 42.8 กม.</span>
          <span><ReceiptText size={16} /> รออนุมัติ 1 รายการ</span>
        </div>
      </div>
    </div>
  );
}

function StepMockup() {
  return (
    <div className="guide-step-visual" aria-label="ตัวอย่างขั้นตอนเช็คอิน">
      <div className="guide-step-screen active">
        <span><Navigation size={18} /></span>
        <strong>เริ่มเดินทาง</strong>
        <small>เลือกต้นทางและปลายทาง</small>
      </div>
      <ArrowRight size={18} />
      <div className="guide-step-screen">
        <span><Camera size={18} /></span>
        <strong>ถ่ายหลักฐาน</strong>
        <small>ไซต์ เลขไมล์ หรือบิล</small>
      </div>
      <ArrowRight size={18} />
      <div className="guide-step-screen done">
        <span><ShieldCheck size={18} /></span>
        <strong>ส่งให้ตรวจ</strong>
        <small>รอแอดมินอนุมัติ</small>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="content-stack guide-page">
      <section className="guide-hero">
        <div className="guide-hero-copy">
          <span className="hero-label">
            <ClipboardCheck size={15} />
            Mobile Field Guide
          </span>
          <h1>วิธีใช้งาน PCC OnSite สำหรับหน้างาน</h1>
          <p>คู่มือสั้นสำหรับพนักงาน ผู้แทนขาย และวิศวกรที่ใช้มือถือเป็นหลัก ตั้งแต่เริ่มเดินทาง เช็คอิน เติมน้ำมัน เพิ่มหน้างาน จนถึงดูรายงาน</p>
          <div className="guide-hero-actions">
            <Link className="button success" href="/check-in">
              <MapPinned size={17} />
              ไปหน้าเช็คอิน
            </Link>
            <Link className="button secondary" href="/dashboard">
              <Gauge size={17} />
              กลับหน้าแรก
            </Link>
          </div>
        </div>
        <PhoneMockup />
      </section>

      <section className="guide-quick-grid">
        {quickSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article className={`guide-quick-card tone-${step.tone}`} key={step.title}>
              <div className="guide-step-number">{index + 1}</div>
              <span><Icon size={22} /></span>
              <h2>{step.title}</h2>
              <p>{step.copy}</p>
            </article>
          );
        })}
      </section>

      <AnimatedWalkthrough />

      <section className="guide-detailed-section">
        <div className="guide-section-heading">
          <span><ClipboardCheck size={20} /></span>
          <div>
            <small>STEP BY STEP</small>
            <h2>วิธีใช้งานแบบละเอียดทีละขั้น</h2>
            <p>ทำตามลำดับตั้งแต่เตรียมมือถือ เริ่มเดินทาง เช็คอิน เก็บหลักฐาน จนถึงตรวจรายงาน</p>
          </div>
        </div>

        <nav className="guide-step-jumps" aria-label="ไปยังขั้นตอนในคู่มือ">
          {detailedSteps.map((step) => (
            <a href={`#guide-step-${step.number}`} key={step.number}>
              <b>{step.number}</b>
              <span>{step.title}</span>
            </a>
          ))}
        </nav>

        <div className="guide-detailed-list">
          {detailedSteps.map((step) => {
            const Icon = step.icon;
            return (
              <article className={`guide-detail-step tone-${step.tone}`} id={`guide-step-${step.number}`} key={step.number}>
                <div className="guide-detail-head">
                  <div className="guide-detail-number">{step.number}</div>
                  <span className="guide-detail-icon"><Icon size={24} /></span>
                  <div>
                    <small>{step.summary}</small>
                    <h3>{step.title}</h3>
                  </div>
                </div>
                <ol className="guide-action-list">
                  {step.actions.map((action) => <li key={action}>{action}</li>)}
                </ol>
                <div className="guide-result-box">
                  <CheckCircle2 size={17} />
                  <p><strong>ตรวจว่าสำเร็จ:</strong> {step.result}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="guide-warning-strip">
        <span><CircleAlert size={22} /></span>
        <div>
          <strong>ข้อมูลผิด อย่าบันทึกซ้ำเพื่อแก้รายการเดิม</strong>
          <p>หากเลือกไซต์ผิด ลืมเช็คเอาท์ เลขไมล์ผิด หรือรูปไม่ครบ ให้ยกเลิกรายการที่ระบบอนุญาตพร้อมใส่เหตุผล หรือแจ้งแอดมินตรวจแก้เพื่อให้ประวัติย้อนหลังชัดเจน</p>
        </div>
      </section>

      <section className="guide-layout">
        <div className="guide-main-column">
          <section className="guide-card">
            <div className="guide-card-heading">
              <span><Route size={18} /></span>
              <div>
                <h2>Flow ที่ควรใช้จริงในแต่ละวัน</h2>
                <p>ทำตามลำดับนี้จะช่วยให้ระยะทาง ค่าน้ำมัน และรายงานไม่สับสน</p>
              </div>
            </div>
            <div className="guide-timeline">
              <div>
                <strong>1. ก่อนออกเดินทาง</strong>
                <p>เปิดหน้าแรก กด “เริ่มงานภาคสนาม” แล้วถ่ายเลขไมล์ต้นวันเพียงครั้งเดียว ก่อนเลือกต้นทางและปลายทางแรก</p>
              </div>
              <div>
                <strong>2. ถึงหน้างาน</strong>
                <p>ดึง GPS เลือกโครงการ ใส่วัตถุประสงค์ และถ่ายรูปงาน ไม่ต้องบันทึกเลขไมล์ซ้ำ</p>
              </div>
              <div>
                <strong>3. ออกจากหน้างาน</strong>
                <p>กดออกจากหน้างานเมื่อเสร็จงานที่จุดนั้น ถ้าจะไปอีกไซต์ให้เริ่มช่วงเดินทางใหม่</p>
              </div>
              <div>
                <strong>4. เติมน้ำมันระหว่างวัน</strong>
                <p>บันทึกเติมน้ำมัน ถ่ายบิลและหน้าปัดเลขไมล์ ระบบจะช่วยอ่านตัวเลขด้วย OCR</p>
              </div>
              <div>
                <strong>5. จบการเดินทางวันนี้</strong>
                <p>เมื่อเสร็จทุกจุด ให้บันทึกเลขไมล์ปลายวันและรูปหน้าปัด ระบบจะเทียบกับ GPS รวม</p>
              </div>
              <div>
                <strong>6. ตรวจรายงานของฉัน</strong>
                <p>ดูระยะทาง ยอดเบิก สถานะอนุมัติ และรายการที่แอดมินขอให้ตรวจสอบเพิ่มเติม</p>
              </div>
            </div>
          </section>

          <section className="guide-card">
            <div className="guide-card-heading">
              <span><Camera size={18} /></span>
              <div>
                <h2>ตัวอย่างขั้นตอนบนมือถือ</h2>
                <p>ภาพจำลองนี้แทนลำดับการกดใช้งานหลักที่เจอบ่อยที่สุด</p>
              </div>
            </div>
            <StepMockup />
          </section>

          <section className="guide-card">
            <div className="guide-card-heading">
              <span><CarFront size={18} /></span>
              <div>
                <h2>ข้อควรรู้เรื่องรถและเลขไมล์</h2>
                <p>ระบบดึงรถของผู้ใช้เองเป็นหลัก และใช้เลขไมล์กับ GPS เพื่อตรวจความถูกต้อง</p>
              </div>
            </div>
            <div className="guide-note-grid">
              {doDont.map((item) => (
                <div key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="guide-side-column">
          <section className="guide-side-card primary">
            <span><MapPinned size={24} /></span>
            <h2>หลักสำคัญ</h2>
            <p>หนึ่งไซต์ควรมีหนึ่งรอบเช็คอินและเช็คเอาท์ ถ้าย้ายไซต์ให้ปิดงานเดิมก่อน เพื่อให้ระบบแยกระยะทางได้ถูก</p>
          </section>

          {roleCards.map((item) => {
            const Icon = item.icon;
            return (
              <section className="guide-side-card" key={item.role}>
                <span><Icon size={22} /></span>
                <h2>{item.role}</h2>
                <ul>
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>
            );
          })}
        </aside>
      </section>
    </div>
  );
}
