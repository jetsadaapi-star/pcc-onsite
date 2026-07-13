import path from "node:path";
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/format";
import { claimStatusLabels } from "@/lib/labels";
import { buildTravelClaimWhere, normalizeReportFilters } from "@/lib/report-filters";

export const runtime = "nodejs";

type ExportFormat = "csv" | "excel" | "pdf";

function csvCell(value: unknown) {
  const text = safeSpreadsheetText(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function safeSpreadsheetText(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function thaiDate(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(value);
}

function documentNo() {
  const stamp = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date()).replaceAll("-", "");
  return `TRV-${stamp}-${Date.now().toString().slice(-6)}`;
}

async function pdfBuffer(input: {
  documentNo: string;
  header: string[];
  rows: unknown[][];
  totalAmount: number;
}) {
  const { default: PDFDocument } = await import("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  const fontPath = path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans-thai", "files", "noto-sans-thai-thai-400-normal.woff");
  try {
    doc.font(fontPath);
  } catch {
    doc.font("Helvetica");
  }

  doc.fontSize(18).text("PCC OnSite - Accounting Travel Summary");
  doc.moveDown(0.25);
  doc.fontSize(10).text(`Document No: ${input.documentNo}`);
  doc.text(`Generated: ${thaiDate(new Date())}`);
  doc.text(`Rows: ${input.rows.length}`);
  doc.text(`Total: ${formatMoney(input.totalAmount)}`);
  doc.moveDown();

  const columns = [0, 1, 3, 4, 7, 20, 21];
  const widths = [74, 82, 96, 96, 58, 72, 64];
  doc.fontSize(8);

  for (const index of columns) {
    doc.text(input.header[index], { continued: index !== columns.at(-1), width: widths[columns.indexOf(index)] });
  }
  doc.moveDown(0.5);

  for (const row of input.rows) {
    if (doc.y > 760) doc.addPage();
    columns.forEach((columnIndex, index) => {
      const value = String(row[columnIndex] ?? "");
      doc.text(value.slice(0, 42), {
        continued: index !== columns.length - 1,
        width: widths[index]
      });
    });
    doc.moveDown(0.35);
  }

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", resolve));
  return Buffer.concat(chunks);
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const filters = normalizeReportFilters({
    q: request.nextUrl.searchParams.get("q"),
    status: request.nextUrl.searchParams.get("status"),
    userId: request.nextUrl.searchParams.get("userId"),
    vehicleId: request.nextUrl.searchParams.get("vehicleId"),
    month: request.nextUrl.searchParams.get("month"),
    from: request.nextUrl.searchParams.get("from"),
    to: request.nextUrl.searchParams.get("to")
  });
  const format = (request.nextUrl.searchParams.get("format") || "csv").toLowerCase() as ExportFormat;
  const safeFormat: ExportFormat = ["csv", "excel", "pdf"].includes(format) ? format : "csv";
  const where = buildTravelClaimWhere(filters, user);

  const claims = await prisma.travelClaim.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    include: {
      user: { select: { name: true, role: true } },
      vehicle: { select: { name: true, licensePlate: true } },
      reviewedBy: { select: { name: true } },
      travelLeg: {
        select: {
          destinationLabel: true,
          fromProject: { select: { name: true } },
          toProject: { select: { name: true } }
        }
      }
    },
    take: 5000
  });

  const header = [
    "วันที่ส่งรายการ",
    "พนักงาน",
    "บทบาท",
    "ต้นทาง",
    "ปลายทาง",
    "รถ",
    "ทะเบียน",
    "ระยะทาง GPS (กม.)",
    "เลขไมล์เริ่ม",
    "เลขไมล์ปลายทาง",
    "ระยะเลขไมล์ (กม.)",
    "ส่วนต่าง %",
    "กม./ลิตร",
    "ราคาเชื้อเพลิง/ลิตร",
    "ค่าน้ำมันประมาณการ",
    "ค่าชดเชยต่อ กม.",
    "ค่าสึกหรอ/ไมล์",
    "ค่าทางด่วน",
    "ค่าจอดรถ",
    "ค่าอื่นๆ",
    "ยอดรวม",
    "สถานะ",
    "ผู้อนุมัติ",
    "วันที่อนุมัติ/ตรวจ",
    "หมายเหตุ"
  ];

  const rows = claims.map((claim) => [
    thaiDate(claim.submittedAt),
    claim.user.name,
    claim.user.role,
    claim.travelLeg.fromProject?.name ?? "จุดเริ่มต้น",
    claim.travelLeg.toProject?.name ?? claim.travelLeg.destinationLabel ?? "สำนักงาน",
    claim.vehicleName ?? claim.vehicle?.name ?? "ใช้ค่าเริ่มต้น",
    claim.vehicleLicensePlate ?? claim.vehicle?.licensePlate ?? "",
    formatNumber(claim.distanceKm, 2),
    claim.odometerStartKm ?? "",
    claim.odometerEndKm ?? "",
    claim.odometerDistanceKm ?? "",
    claim.distanceVariancePercent === null ? "" : formatNumber(claim.distanceVariancePercent, 2),
    formatNumber(claim.kmPerLiter, 1),
    formatMoney(claim.fuelPricePerLiter),
    formatMoney(claim.fuelEstimate),
    formatMoney(claim.ratePerKm),
    formatMoney(claim.mileageAmount),
    formatMoney(claim.tollAmount),
    formatMoney(claim.parkingAmount),
    formatMoney(claim.otherAmount),
    formatMoney(claim.totalAmount),
    claimStatusLabels[claim.status],
    claim.reviewedBy?.name ?? "",
    claim.reviewedAt ? thaiDate(claim.reviewedAt) : "",
    claim.adminNote ?? claim.overrideReason ?? ""
  ]);

  const totalAmount = claims.reduce((sum, claim) => sum + Number(claim.totalAmount), 0);
  const docNo = documentNo();
  const extension = safeFormat === "excel" ? "xlsx" : safeFormat;
  const fileName = `accounting-travel-report-${docNo}.${extension}`;
  await prisma.exportDocument.create({
    data: {
      documentNo: docNo,
      type: "ACCOUNTING_TRAVEL",
      format: safeFormat === "excel" ? "EXCEL" : safeFormat.toUpperCase() as "CSV" | "PDF",
      generatedById: user.id,
      filters,
      rowCount: rows.length,
      totalAmount,
      fileName
    }
  });

  if (safeFormat === "excel") {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PCC OnSite";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Travel claims", { views: [{ state: "frozen", ySplit: 5 }] });
    sheet.addRow(["PCC OnSite Accounting Travel Report"]);
    sheet.addRow(["เลขเอกสาร", docNo]);
    sheet.addRow(["วันที่สร้าง", thaiDate(new Date())]);
    sheet.addRow(["ยอดรวม", totalAmount]);
    sheet.addRow(header);
    for (const row of rows) sheet.addRow(row.map(safeSpreadsheetText));
    sheet.getRow(1).font = { bold: true, size: 16 };
    sheet.getRow(5).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF095AA4" } };
    sheet.columns.forEach((column) => { column.width = 18; });
    sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: header.length } };
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  }

  if (safeFormat === "pdf") {
    const buffer = await pdfBuffer({ documentNo: docNo, header, rows, totalAmount });
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  }

  const csv = "\uFEFF" + [
    ["เลขเอกสาร", docNo],
    [],
    header,
    ...rows
  ].map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
