import path from "node:path";
import { formatMoney } from "@/lib/format";

type TravelReportPdfInput = {
  documentNo: string;
  generatedAt: string;
  header: string[];
  rows: unknown[][];
  totalAmount: number;
};

export async function createTravelReportPdf(input: TravelReportPdfInput) {
  const { default: PDFDocument } = await import("pdfkit");
  const fontPath = path.join(
    process.cwd(),
    "node_modules",
    "@fontsource",
    "noto-sans-thai",
    "files",
    "noto-sans-thai-thai-400-normal.woff"
  );
  const doc = new PDFDocument({
    size: "A4",
    margin: 36,
    bufferPages: true,
    font: fontPath
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  doc.fontSize(18).text("PCC OnSite - Accounting Travel Summary");
  doc.moveDown(0.25);
  doc.fontSize(10).text(`Document No: ${input.documentNo}`);
  doc.text(`Generated: ${input.generatedAt}`);
  doc.text(`Rows: ${input.rows.length}`);
  doc.text(`Total: ${formatMoney(input.totalAmount)}`);
  doc.moveDown();

  const columns = [0, 1, 3, 4, 7, 20, 21];
  const widths = [74, 82, 96, 96, 58, 72, 64];
  doc.fontSize(8);

  for (const index of columns) {
    doc.text(input.header[index], {
      continued: index !== columns.at(-1),
      width: widths[columns.indexOf(index)]
    });
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

  const completed = new Promise<void>((resolve, reject) => {
    doc.once("end", resolve);
    doc.once("error", reject);
  });
  doc.end();
  await completed;
  return Buffer.concat(chunks);
}
